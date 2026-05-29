/**
 * ISO 8601 week-of-year. Used as the KV key partition so the WAU readout
 * is a prefix-scan on `session:<week>:`.
 *
 * Returns `YYYY-Www` (e.g. `2026-W22`). Week 01 is the week containing the
 * first Thursday of the year — see ISO 8601 §2.2.10.
 */
export function isoWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
