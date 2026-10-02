import express from "express";
import ExcelJS from "exceljs";
import { requireAdmin, requireStaff } from "../middleware/auth.js";
import QbitRegistration from "../models/QbitRegistration.js";
import {
  TEAMS_HEADERS,
  MEMBERS_HEADERS,
  TEAMS_COLUMN_WIDTHS,
  MEMBERS_COLUMN_WIDTHS,
  buildSheetPayload,
} from "../lib/qbitSheetFormat.js";
import {
  fullSyncQbitSheet,
  getSheetsSyncStatus,
} from "../lib/googleSheets.js";

const router = express.Router();

const MAX_LIST_LIMIT = 100;
const MAX_EXPORT_ROWS = 5000;
const SORT_FIELDS = {
  createdAt: "createdAt",
  teamName: "teamName",
  college: "college",
};

// Escape regex special chars so `search` can't break the query / ReDoS easily
const escapeRegex = (s) => String(s).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Levenshtein distance for Elasticsearch-style typo tolerance
function levenshteinDistance(s1, s2) {
  const a = String(s1 || "").toLowerCase().trim();
  const b = String(s2 || "").toLowerCase().trim();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// Calculate similarity score between 0 and 100
function scoreFieldFuzzy(target, searchTokens, rawQuery) {
  if (!target) return 0;
  const str = String(target).toLowerCase().trim();
  const cleanStr = str.replace(/[_\-\s]+/g, " ");
  const normalizedRaw = rawQuery.toLowerCase().trim().replace(/[_\-\s]+/g, " ");

  // 1. Exact match
  if (str === normalizedRaw || cleanStr === normalizedRaw) return 100;
  // 2. Substring match
  if (cleanStr.includes(normalizedRaw)) return 85;

  // 3. Delimiter-free match (e.g. 'test_team' matches 'test team')
  const noDelimStr = str.replace(/[_\-\s]+/g, "");
  const noDelimQuery = normalizedRaw.replace(/[_\-\s]+/g, "");
  if (noDelimStr.includes(noDelimQuery) || noDelimQuery.includes(noDelimStr)) return 80;

  // 4. Word-level token matching with Levenshtein typo-tolerance
  const targetWords = cleanStr.split(/\s+/).filter(Boolean);
  let totalScore = 0;
  let matches = 0;

  for (const token of searchTokens) {
    if (!token) continue;
    let bestTokenScore = 0;

    for (const tw of targetWords) {
      if (tw === token) {
        bestTokenScore = Math.max(bestTokenScore, 75);
      } else if (tw.startsWith(token) || token.startsWith(tw)) {
        bestTokenScore = Math.max(bestTokenScore, 65);
      } else if (tw.includes(token) || token.includes(tw)) {
        bestTokenScore = Math.max(bestTokenScore, 55);
      } else {
        const maxAllowedDist = token.length <= 3 ? 1 : token.length <= 6 ? 2 : 3;
        const dist = levenshteinDistance(token, tw);
        if (dist <= maxAllowedDist) {
          const sim = 1 - dist / Math.max(token.length, tw.length);
          bestTokenScore = Math.max(bestTokenScore, Math.round(50 * sim));
        }
      }
    }

    if (searchTokens.length === 1) {
      const dist = levenshteinDistance(normalizedRaw, cleanStr);
      const maxAllowedDist = normalizedRaw.length <= 4 ? 1 : 2;
      if (dist <= maxAllowedDist) {
        const sim = 1 - dist / Math.max(normalizedRaw.length, cleanStr.length);
        bestTokenScore = Math.max(bestTokenScore, Math.round(60 * sim));
      }
    }

    if (bestTokenScore > 0) {
      totalScore += bestTokenScore;
      matches++;
    }
  }

  return matches > 0 ? Math.round(totalScore / searchTokens.length) : 0;
}

// Score an entire team record against a search query
function scoreTeamFuzzy(team, queryStr) {
  if (!queryStr || !queryStr.trim()) return 100;
  const rawQuery = queryStr.trim();
  const searchTokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);

  let bestScore = 0;

  // Check registrationCode (weight: 1.5 - high priority for event desk lookups)
  if (team.registrationCode) {
    const codeScore = scoreFieldFuzzy(team.registrationCode, searchTokens, rawQuery);
    if (codeScore > 0) bestScore = Math.max(bestScore, Math.round(codeScore * 1.5));
  }

  // Check teamName (weight: 1.3)
  const teamScore = scoreFieldFuzzy(team.teamName, searchTokens, rawQuery);
  if (teamScore > 0) bestScore = Math.max(bestScore, Math.round(teamScore * 1.3));

  // Check college (weight: 1.1)
  const collegeScore = scoreFieldFuzzy(team.college, searchTokens, rawQuery);
  if (collegeScore > 0) bestScore = Math.max(bestScore, Math.round(collegeScore * 1.1));

  // Check members
  if (Array.isArray(team.members)) {
    for (const m of team.members) {
      const nameScore = scoreFieldFuzzy(m.name, searchTokens, rawQuery);
      if (nameScore > 0) bestScore = Math.max(bestScore, Math.round(nameScore * 1.2));

      const emailScore = scoreFieldFuzzy(m.email, searchTokens, rawQuery);
      if (emailScore > 0) bestScore = Math.max(bestScore, Math.round(emailScore * 1.0));

      const phoneScore = scoreFieldFuzzy(m.phone, searchTokens, rawQuery);
      if (phoneScore > 0) bestScore = Math.max(bestScore, Math.round(phoneScore * 1.0));

      const courseScore = scoreFieldFuzzy(m.course, searchTokens, rawQuery);
      if (courseScore > 0) bestScore = Math.max(bestScore, Math.round(courseScore * 0.8));
    }
  }

  return bestScore;
}

function buildQbitBaseFilter(query) {
  const and = [];

  if (query.college) {
    const safe = escapeRegex(query.college.trim());
    if (safe) and.push({ college: { $regex: safe, $options: "i" } });
  }

  if (query.status) {
    const safe = escapeRegex(query.status.trim().toUpperCase());
    if (safe && ['CONFIRMED', 'CHECKED_IN', 'DISQUALIFIED'].includes(safe)) {
      and.push({ status: safe });
    }
  }

  if (query.checkedIn !== undefined && query.checkedIn !== "") {
    const isChecked = String(query.checkedIn).toLowerCase() === "true" || query.checkedIn === "1";
    and.push({ checkedIn: isChecked });
  }

  // All teams are strictly 4 members
  if (query.size !== undefined && query.size !== "") {
    const size = parseInt(query.size, 10);
    if (size !== 4) {
      const err = new Error("All teams must have 4 members");
      err.statusCode = 400;
      throw err;
    }
    and.push({ members: { $size: 4 } });
  }

  const { from, to, startDate, endDate } = query;
  const fromRaw = from || startDate;
  const toRaw = to || endDate;
  const dateFilter = {};
  if (fromRaw) {
    const d = new Date(fromRaw);
    if (isNaN(d.getTime())) {
      const err = new Error("from/startDate must be a valid date");
      err.statusCode = 400;
      throw err;
    }
    d.setUTCHours(0, 0, 0, 0);
    dateFilter.$gte = d;
  }
  if (toRaw) {
    const d = new Date(toRaw);
    if (isNaN(d.getTime())) {
      const err = new Error("to/endDate must be a valid date");
      err.statusCode = 400;
      throw err;
    }
    d.setUTCHours(23, 59, 59, 999);
    dateFilter.$lte = d;
  }
  if (Object.keys(dateFilter).length) and.push({ createdAt: dateFilter });

  return and.length ? { $and: and } : {};
}

function parseSort(query) {
  const sortBy = SORT_FIELDS[query.sortBy] || "createdAt";
  const sortOrder = String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  return { [sortBy]: sortOrder, sortBy, sortOrder };
}

// GET /api/qbit/admin/teams — paginated list with fuzzy typo-tolerant search
router.get("/admin/teams", requireStaff, async (req, res) => {
  try {
    const baseFilter = buildQbitBaseFilter(req.query);
    const { sortBy, sortOrder } = parseSort(req.query);

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > MAX_LIST_LIMIT) limit = MAX_LIST_LIMIT;

    const searchTerm = req.query.search ? req.query.search.trim() : "";

    if (searchTerm) {
      // Elasticsearch-style fuzzy matching: fetch filtered candidates and score
      const allCandidates = await QbitRegistration.find(baseFilter).lean();

      const scored = [];
      for (const t of allCandidates) {
        const score = scoreTeamFuzzy(t, searchTerm);
        if (score > 0) {
          scored.push({ ...t, _score: score });
        }
      }

      // Sort by relevance score descending first, then by requested field
      scored.sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        if (a[sortBy] < b[sortBy]) return -sortOrder;
        if (a[sortBy] > b[sortBy]) return sortOrder;
        return 0;
      });

      const total = scored.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (page > totalPages) page = totalPages;

      const paginatedTeams = scored.slice((page - 1) * limit, page * limit);

      return res.json({
        message: "Q-Bit teams retrieved successfully",
        total,
        page,
        limit,
        totalPages,
        count: paginatedTeams.length,
        teams: paginatedTeams,
      });
    }

    // Standard indexed path when no search query is specified
    const total = await QbitRegistration.countDocuments(baseFilter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;

    const teams = await QbitRegistration.find(baseFilter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      message: "Q-Bit teams retrieved successfully",
      total,
      page,
      limit,
      totalPages,
      count: teams.length,
      teams,
    });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    console.error("List qbit teams error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/qbit/admin/teams/export — same filters -> .xlsx download
router.get("/admin/teams/export", requireAdmin, async (req, res) => {
  try {
    const baseFilter = buildQbitBaseFilter(req.query);
    const { sortBy, sortOrder } = parseSort(req.query);
    const searchTerm = req.query.search ? req.query.search.trim() : "";

    let teams = [];
    if (searchTerm) {
      const allCandidates = await QbitRegistration.find(baseFilter).lean();
      const scored = [];
      for (const t of allCandidates) {
        const score = scoreTeamFuzzy(t, searchTerm);
        if (score > 0) scored.push({ ...t, _score: score });
      }
      scored.sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        if (a[sortBy] < b[sortBy]) return -sortOrder;
        if (a[sortBy] > b[sortBy]) return sortOrder;
        return 0;
      });
      teams = scored;
    } else {
      teams = await QbitRegistration.find(baseFilter).sort({ [sortBy]: sortOrder }).lean();
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "QCM Backend";
    workbook.created = new Date();

    const headerStyle = (cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    };

    // Row data shared with the Google Sheets mirror (lib/qbitSheetFormat.js)
    const { teamsRows, membersRows } = buildSheetPayload(teams);

    // Sheet 1: Teams (one row per team, members expanded)
    const teamsSheet = workbook.addWorksheet("Teams");
    teamsSheet.columns = TEAMS_HEADERS.map((header, i) => ({
      header,
      width: TEAMS_COLUMN_WIDTHS[i],
    }));
    teamsSheet.getRow(1).eachCell(headerStyle);
    teamsSheet.views = [{ state: "frozen", ySplit: 1 }];
    teamsSheet.autoFilter = { from: "A1", to: "U1" };
    teamsRows.forEach((row) => teamsSheet.addRow(row));

    // Sheet 2: Members flat (one row per member — best for Excel filtering)
    const membersSheet = workbook.addWorksheet("Members");
    membersSheet.columns = MEMBERS_HEADERS.map((header, i) => ({
      header,
      width: MEMBERS_COLUMN_WIDTHS[i],
    }));
    membersSheet.getRow(1).eachCell(headerStyle);
    membersSheet.views = [{ state: "frozen", ySplit: 1 }];
    membersSheet.autoFilter = { from: "A1", to: "I1" };
    membersRows.forEach((row) => membersSheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="qbit-teams-${stamp}.xlsx"`);
    res.setHeader("Content-Length", buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    console.error("Export qbit teams error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/qbit/admin/teams/sync-sheet — full reconcile of the Google Sheet
// mirror from MongoDB. Called by the admin dashboard "Refresh" button.
// Rewrites data rows on both tabs, so missed appends / hand edits heal here.
router.post("/admin/teams/sync-sheet", requireAdmin, async (req, res) => {
  try {
    const result = await fullSyncQbitSheet();
    res.json({
      message: "Google Sheet synced successfully",
      ...result,
    });
  } catch (error) {
    if (error.statusCode === 503) return res.status(503).json({ error: error.message });
    console.error("Sync qbit sheet error:", error);
    res.status(500).json({ error: "Failed to sync Google Sheet" });
  }
});

// GET /api/qbit/admin/teams/sync-status — sync health for the dashboard
// (whether Sheets is configured, last sync time/result/error)
router.get("/admin/teams/sync-status", requireAdmin, async (req, res) => {
  try {
    res.json(getSheetsSyncStatus());
  } catch (error) {
    console.error("Qbit sync-status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/qbit/admin/teams/stats — counts for admin dashboard header
router.get("/admin/teams/stats", requireStaff, async (req, res) => {
  try {
    const baseFilter = buildQbitBaseFilter(req.query);
    const teams = await QbitRegistration.find(baseFilter).select("members college checkedIn status").lean();

    let totalParticipants = 0;
    let checkedInTeams = 0;
    const colleges = new Set();
    teams.forEach((t) => {
      const n = t.members?.length ?? 0;
      totalParticipants += n;
      if (t.checkedIn || t.status === "CHECKED_IN") checkedInTeams++;
      if (t.college) colleges.add(t.college.trim().toLowerCase());
    });

    res.json({
      totalTeams: teams.length,
      totalParticipants,
      uniqueColleges: colleges.size,
      checkedInTeams,
    });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    console.error("Qbit stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/qbit/admin/teams/duplicates — detect cross-team duplicate participants
router.get("/admin/teams/duplicates", requireStaff, async (req, res) => {
  try {
    const teams = await QbitRegistration.find().select("teamName registrationCode college members createdAt").lean();
    const emailMap = new Map();
    const phoneMap = new Map();
    const duplicateTeamIds = new Set();
    const conflicts = [];

    for (const team of teams) {
      if (!Array.isArray(team.members)) continue;
      for (const m of team.members) {
        if (m.email) {
          const em = m.email.toLowerCase().trim();
          if (emailMap.has(em)) {
            const prior = emailMap.get(em);
            duplicateTeamIds.add(team._id.toString());
            duplicateTeamIds.add(prior.teamId);
            conflicts.push({
              type: "email",
              value: em,
              memberName: m.name,
              teamA: { id: prior.teamId, name: prior.teamName, code: prior.code },
              teamB: { id: team._id.toString(), name: team.teamName, code: team.registrationCode }
            });
          } else {
            emailMap.set(em, { teamId: team._id.toString(), teamName: team.teamName, code: team.registrationCode });
          }
        }

        if (m.phone) {
          const ph = m.phone.trim();
          if (phoneMap.has(ph)) {
            const prior = phoneMap.get(ph);
            duplicateTeamIds.add(team._id.toString());
            duplicateTeamIds.add(prior.teamId);
            conflicts.push({
              type: "phone",
              value: ph,
              memberName: m.name,
              teamA: { id: prior.teamId, name: prior.teamName, code: prior.code },
              teamB: { id: team._id.toString(), name: team.teamName, code: team.registrationCode }
            });
          } else {
            phoneMap.set(ph, { teamId: team._id.toString(), teamName: team.teamName, code: team.registrationCode });
          }
        }
      }
    }

    res.json({
      totalConflicts: conflicts.length,
      affectedTeamsCount: duplicateTeamIds.size,
      conflicts
    });
  } catch (error) {
    console.error("Duplicates check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/qbit/admin/teams/:id — view single team
router.get("/admin/teams/:id", requireStaff, async (req, res) => {
  try {
    const team = await QbitRegistration.findById(req.params.id).lean();
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json({ team });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/qbit/admin/teams/:id — update team information (fix typos, update members)
router.patch("/admin/teams/:id", requireStaff, async (req, res) => {
  try {
    const { teamName, college, notes, members, status } = req.body;
    const team = await QbitRegistration.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    if (teamName && teamName.trim()) {
      team.teamName = teamName.trim();
      team.teamKey = teamName.toLowerCase().trim();
    }
    if (college && college.trim()) team.college = college.trim();
    if (notes !== undefined) team.notes = String(notes || "").trim();
    if (status && ['CONFIRMED', 'CHECKED_IN', 'DISQUALIFIED'].includes(status.toUpperCase())) {
      team.status = status.toUpperCase();
      if (team.status === 'CHECKED_IN' && !team.checkedIn) {
        team.checkedIn = true;
        team.checkedInAt = new Date();
        team.checkedInBy = req.user?.name || req.user?.email || "Staff";
      }
    }

    if (Array.isArray(members) && members.length === 4) {
      team.members = members.map(m => ({
        name: String(m.name || "").trim(),
        phone: String(m.phone || "").replace(/\D/g, "").slice(-10),
        email: String(m.email || "").toLowerCase().trim(),
        course: String(m.course || "").trim()
      }));
    }

    await team.save();

    res.json({
      message: "Team updated successfully",
      team
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Team name already exists" });
    }
    console.error("Update team error:", error);
    res.status(500).json({ error: "Failed to update team" });
  }
});

// POST /api/qbit/admin/teams/:id/checkin — quick venue check-in toggle
router.post("/admin/teams/:id/checkin", requireStaff, async (req, res) => {
  try {
    const team = await QbitRegistration.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const newCheckedIn = req.body.checkedIn !== undefined ? !!req.body.checkedIn : !team.checkedIn;
    team.checkedIn = newCheckedIn;
    if (newCheckedIn) {
      team.checkedInAt = new Date();
      team.checkedInBy = req.user?.name || req.user?.email || "Desk Staff";
      team.status = "CHECKED_IN";
    } else {
      team.checkedInAt = null;
      team.checkedInBy = null;
      team.status = "CONFIRMED";
    }

    await team.save();

    res.json({
      message: newCheckedIn ? `Team "${team.teamName}" checked in successfully` : `Team "${team.teamName}" check-in reverted`,
      team
    });
  } catch (error) {
    console.error("Checkin team error:", error);
    res.status(500).json({ error: "Failed to update check-in status" });
  }
});

// DELETE /api/qbit/admin/teams/:id — delete team registration (strictly Admin)
router.delete("/admin/teams/:id", requireAdmin, async (req, res) => {
  try {
    const team = await QbitRegistration.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json({
      message: `Team "${team.teamName}" deleted successfully`,
      deletedId: req.params.id
    });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

export default router;

