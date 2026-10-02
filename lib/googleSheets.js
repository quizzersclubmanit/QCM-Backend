// Google Sheets mirror for Q-Bit registrations.
//
// Flow:
// - Auto: routes/auth.js signup calls appendTeamToSheet() best-effort after
//   the team is saved (a Sheets outage must NEVER fail a registration).
// - Manual: admin dashboard "Refresh" button calls
//   POST /api/qbit/admin/teams/sync-sheet, which runs fullSyncQbitSheet().
//   Full sync clears data rows below the headers and rewrites everything from
//   MongoDB, so the sheet always ends up exactly equal to the DB (self-healing
//   for any missed appends, hand edits, or deleted rows).
//
// Setup (one-time):
// 1. GCP project with Google Sheets API (+ Drive API if the backend should
//    create the file) enabled; create a service account, download its JSON key.
// 2. Share the target spreadsheet with the service-account email as Editor,
//    OR let the backend create it (not implemented — spreadsheet must exist).
// 3. Set env: QBIT_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON string)
//    or GOOGLE_SERVICE_ACCOUNT_PATH (path to the key file).
//    Optional overrides: QBIT_SHEET_TAB_TEAMS (default "Teams"),
//    QBIT_SHEET_TAB_MEMBERS (default "Members").
//
// NOTE: env is read lazily (not at import time) because dotenv.config() in
// server.js runs after ES imports are evaluated.

import fs from "node:fs";
import { google } from "googleapis";
import QbitRegistration from "../models/QbitRegistration.js";
import {
  TEAMS_HEADERS,
  MEMBERS_HEADERS,
  buildSheetPayload,
  teamToTeamsRow,
  teamToMemberRows,
} from "./qbitSheetFormat.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let cachedSheets = null;

// In-memory sync health (resets on restart — fine for a dashboard hint)
const syncStatus = {
  lastSyncAt: null,
  lastResult: null,
  lastError: null,
};

function tabNames() {
  return {
    teamsTab: process.env.QBIT_SHEET_TAB_TEAMS || "Teams",
    membersTab: process.env.QBIT_SHEET_TAB_MEMBERS || "Members",
  };
}

export function isSheetsConfigured() {
  return Boolean(
    process.env.QBIT_SHEET_ID &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_PATH)
  );
}

export function getSheetsSyncStatus() {
  return {
    configured: isSheetsConfigured(),
    sheetIdSet: Boolean(process.env.QBIT_SHEET_ID),
    lastSyncAt: syncStatus.lastSyncAt,
    lastResult: syncStatus.lastResult,
    lastError: syncStatus.lastError,
  };
}

function notConfiguredError() {
  const err = new Error(
    "Google Sheets sync is not configured. Set QBIT_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT_PATH)."
  );
  err.statusCode = 503;
  return err;
}

function loadCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  const p = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (p) return JSON.parse(fs.readFileSync(p, "utf8"));
  throw notConfiguredError();
}

function getSheetsClient() {
  if (cachedSheets) return cachedSheets;
  const auth = new google.auth.GoogleAuth({ credentials: loadCredentials(), scopes: SCOPES });
  cachedSheets = google.sheets({ version: "v4", auth });
  return cachedSheets;
}

// Sheets API only accepts strings/numbers/bools — stringify Dates, blank nulls
const toCell = (v) => {
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return "";
  return v;
};
const toRow = (row) => row.map(toCell);

// Create missing tabs and (re)write header row 1 on both tabs
async function ensureTabsAndHeaders(sheets, spreadsheetId, teamsTab, membersTab) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title));

  const missing = [teamsTab, membersTab].filter((t) => !existing.has(t));
  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `${teamsTab}!A1`, values: [TEAMS_HEADERS] },
        { range: `${membersTab}!A1`, values: [MEMBERS_HEADERS] },
      ],
    },
  });
}

// Full reconcile: clear data rows, rewrite everything from MongoDB.
// Called by the admin Refresh button. Self-heals missed appends/hand edits.
export async function fullSyncQbitSheet() {
  if (!isSheetsConfigured()) throw notConfiguredError();
  const spreadsheetId = process.env.QBIT_SHEET_ID;
  const { teamsTab, membersTab } = tabNames();
  const sheets = getSheetsClient();

  try {
    const teams = await QbitRegistration.find({}).sort({ createdAt: 1 }).lean();
    const { teamsRows, membersRows } = buildSheetPayload(teams);

    await ensureTabsAndHeaders(sheets, spreadsheetId, teamsTab, membersTab);

    await sheets.spreadsheets.values.batchClear({
      spreadsheetId,
      requestBody: { ranges: [`${teamsTab}!A2:Z`, `${membersTab}!A2:Z`] },
    });

    const data = [];
    if (teamsRows.length) {
      data.push({ range: `${teamsTab}!A2`, values: teamsRows.map(toRow) });
    }
    if (membersRows.length) {
      data.push({ range: `${membersTab}!A2`, values: membersRows.map(toRow) });
    }
    if (data.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data },
      });
    }

    const result = {
      totalTeams: teams.length,
      teamRows: teamsRows.length,
      memberRows: membersRows.length,
      syncedAt: new Date().toISOString(),
    };
    syncStatus.lastSyncAt = result.syncedAt;
    syncStatus.lastResult = result;
    syncStatus.lastError = null;
    return result;
  } catch (error) {
    syncStatus.lastError = error.message;
    throw error;
  }
}

// Best-effort single-team append for the signup path.
// Returns { skipped: true } when unconfigured; throws on API failure
// (caller must catch — signup must never fail because Sheets is down).
export async function appendTeamToSheet(team) {
  if (!isSheetsConfigured()) return { skipped: true };
  const spreadsheetId = process.env.QBIT_SHEET_ID;
  const { teamsTab, membersTab } = tabNames();
  const sheets = getSheetsClient();

  try {
    await ensureTabsAndHeaders(sheets, spreadsheetId, teamsTab, membersTab);

    const [teamsCol, membersCol] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${teamsTab}!A:A` }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${membersTab}!A:A` }),
    ]);
    // Col A holds header + one S.No per row, so its length IS the next S.No
    const nextTeamSno = (teamsCol.data.values || []).length || 1;
    const nextMemberSno = (membersCol.data.values || []).length || 1;

    const { rows: memberRows } = teamToMemberRows(nextMemberSno, team);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${teamsTab}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [toRow(teamToTeamsRow(nextTeamSno, team))] },
    });
    if (memberRows.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${membersTab}!A:A`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: memberRows.map(toRow) },
      });
    }
    return { skipped: false, teamName: team.teamName };
  } catch (error) {
    syncStatus.lastError = error.message;
    throw error;
  }
}
