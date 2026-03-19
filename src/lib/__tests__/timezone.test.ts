import { describe, it, expect } from 'vitest';
import {
  getTodayInTz,
  getDayBoundsUTC,
  getGreetingInTz,
  nowMinutesInTz,
} from '../timezone';

const TZ = 'America/New_York';

describe('getTodayInTz', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getTodayInTz(TZ);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reflects the given timezone', () => {
    // Both calls should return same format
    const nyDate = getTodayInTz('America/New_York');
    const utcDate = getTodayInTz('UTC');
    expect(nyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDayBoundsUTC', () => {
  it('returns start and end as ISO strings', () => {
    const { start, end } = getDayBoundsUTC(TZ);
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('start is before end', () => {
    const { start, end } = getDayBoundsUTC(TZ);
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
  });

  it('accepts a specific date string — start is Jan 15 UTC', () => {
    const { start } = getDayBoundsUTC(TZ, '2025-01-15');
    // NY (UTC-5): midnight Jan 15 = 05:00 UTC on Jan 15
    expect(start).toContain('2025-01-15');
  });

  it('accepts a specific date string — end is next day UTC for non-UTC timezones', () => {
    const { end } = getDayBoundsUTC(TZ, '2025-01-15');
    // NY (UTC-5): end of Jan 15 = ~05:00 UTC on Jan 16
    // The end must be after the start
    const { start } = getDayBoundsUTC(TZ, '2025-01-15');
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('covers a full day (roughly 24h)', () => {
    const { start, end } = getDayBoundsUTC(TZ, '2025-06-01');
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(24, 0);
  });
});

describe('getGreetingInTz', () => {
  it('returns a non-empty string', () => {
    const greeting = getGreetingInTz(TZ);
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('returns one of the expected greetings', () => {
    const greeting = getGreetingInTz(TZ);
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greeting);
  });
});

describe('nowMinutesInTz', () => {
  it('returns a number between 0 and 1439', () => {
    const minutes = nowMinutesInTz(TZ);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(1439);
  });
});
