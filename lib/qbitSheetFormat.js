// Shared row formatting for Q-Bit registrations.
// Used by BOTH the .xlsx export (routes/qbit.js) and the Google Sheets mirror
// (lib/googleSheets.js) so the two outputs always agree.
//
// `createdAt` is passed through untouched (a Date in Mongoose lean docs):
// ExcelJS renders Dates as date cells, while googleSheets.js stringifies them.

export const TEAMS_HEADERS = [
  "S.No",
  "Reg Code",
  "Team Name",
  "College",
  "Team Email",
  "Status",
  "Checked In",
  "Team Size",
  "Registered At",
  "M1 Name",
  "M1 Phone",
  "M1 Course",
  "M2 Name",
  "M2 Phone",
  "M2 Course",
  "M3 Name",
  "M3 Phone",
  "M3 Course",
  "M4 Name",
  "M4 Phone",
  "M4 Course",
];

export const MEMBERS_HEADERS = [
  "S.No",
  "Reg Code",
  "Team Name",
  "College",
  "Team Email",
  "Status",
  "Checked In",
  "Member #",
  "Name",
  "Phone",
  "Course",
  "Registered At",
];

// Column widths for the .xlsx export (index-aligned with the headers above)
export const TEAMS_COLUMN_WIDTHS = [
  7, 16, 28, 32, 28, 14, 12, 11, 20,
  24, 16, 22,
  24, 16, 22,
  24, 16, 22,
  24, 16, 22,
];

export const MEMBERS_COLUMN_WIDTHS = [7, 16, 28, 32, 28, 14, 12, 11, 24, 16, 22, 20];

// One row per team, members expanded into M1..M4 column groups
export function teamToTeamsRow(sno, team) {
  const row = [
    sno,
    team.registrationCode ?? "",
    team.teamName ?? "",
    team.college ?? "",
    team.email ?? team.members?.[0]?.email ?? "",
    team.status ?? "CONFIRMED",
    team.checkedIn ? "YES" : "NO",
    team.members?.length ?? 0,
    team.createdAt ?? "",
  ];
  for (let m = 0; m < 4; m++) {
    const mem = team.members?.[m];
    row.push(mem?.name ?? "", mem?.phone ?? "", mem?.course ?? "");
  }
  return row;
}

// One row per member; returns rows + the next free S.No for chaining
export function teamToMemberRows(snoStart, team) {
  const rows = (team.members || []).map((mem, idx) => [
    snoStart + idx,
    team.registrationCode ?? "",
    team.teamName ?? "",
    team.college ?? "",
    team.email ?? mem.email ?? "",
    team.status ?? "CONFIRMED",
    team.checkedIn ? "YES" : "NO",
    idx + 1,
    mem.name ?? "",
    mem.phone ?? "",
    mem.course ?? "",
    team.createdAt ?? "",
  ]);
  return { rows, nextSno: snoStart + rows.length };
}

// Full two-tab payload for a list of teams (sorted before calling for stable S.No)
export function buildSheetPayload(teams) {
  const teamsRows = teams.map((t, i) => teamToTeamsRow(i + 1, t));
  const membersRows = [];
  let sno = 1;
  for (const t of teams) {
    const { rows, nextSno } = teamToMemberRows(sno, t);
    membersRows.push(...rows);
    sno = nextSno;
  }
  return { teamsRows, membersRows };
}
