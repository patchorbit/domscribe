import { describe, expect, it } from 'vitest';
import { isoWeek } from '../src/iso-week.js';

describe('isoWeek', () => {
  // ISO 8601 reference dates — independently verifiable.
  const cases: Array<[string, string]> = [
    ['2024-01-01', '2024-W01'], // Monday — week 1
    ['2023-01-01', '2022-W52'], // Sunday — belongs to prior year's last week
    ['2025-12-29', '2026-W01'], // Monday — belongs to next year's first week
    ['2026-01-01', '2026-W01'], // Thursday — week containing first Thursday
    ['2026-05-29', '2026-W22'], // sprint 2491 start
    ['2026-06-12', '2026-W24'], // sprint 2491 close
    ['2026-08-20', '2026-W34'], // inherited falsifier date
    ['2020-12-31', '2020-W53'], // ISO 53-week year
  ];

  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(isoWeek(new Date(`${input}T12:00:00Z`))).toBe(expected);
    });
  }
});
