import { describe, it, expect } from 'vitest';
import { aggregateAccidentsByWeek, extractDailyRatings, aggregateBehaviorByWeek, aggregateMedicalByWeek } from '../lib/chart-utils';

const makeEvent = (type: string, date: string, data: any) => ({ eventType: type, date, occurredAt: `${date}T12:00:00Z`, data });

describe('chart-utils', () => {
  describe('aggregateAccidentsByWeek', () => {
    it('groups accidents by week and type', () => {
      const events = [
        makeEvent('ACCIDENT', '2026-03-24', { type: 'pee', location: 'hall' }),
        makeEvent('ACCIDENT', '2026-03-25', { type: 'poop', location: 'room' }),
        makeEvent('ACCIDENT', '2026-03-25', { type: 'pee', location: 'kitchen' }),
      ];
      const result = aggregateAccidentsByWeek(events);
      expect(result).toHaveLength(1);
      expect(result[0].pee).toBe(2);
      expect(result[0].poop).toBe(1);
    });

    it('returns empty for no accidents', () => {
      expect(aggregateAccidentsByWeek([makeEvent('MEDICAL', '2026-03-24', {})])).toEqual([]);
    });
  });

  describe('extractDailyRatings', () => {
    it('extracts ratings sorted by date', () => {
      const events = [
        makeEvent('DAY_RATING', '2026-03-26', { rating: 4 }),
        makeEvent('DAY_RATING', '2026-03-25', { rating: 2 }),
      ];
      const result = extractDailyRatings(events);
      expect(result).toEqual([
        { date: '03-25', rating: 2 },
        { date: '03-26', rating: 4 },
      ]);
    });
  });

  describe('aggregateBehaviorByWeek', () => {
    it('counts behaviors per week', () => {
      const events = [
        makeEvent('BEHAVIOR', '2026-03-24', { behaviorType: 'Pacing' }),
        makeEvent('BEHAVIOR', '2026-03-25', { behaviorType: 'Hiding' }),
      ];
      const result = aggregateBehaviorByWeek(events);
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
    });
  });

  describe('aggregateMedicalByWeek', () => {
    it('groups medical events by type and week', () => {
      const events = [
        makeEvent('MEDICAL', '2026-03-24', { medicalType: 'Vomiting' }),
        makeEvent('MEDICAL', '2026-03-25', { medicalType: 'Vomiting' }),
        makeEvent('MEDICAL', '2026-03-25', { medicalType: 'Diarrhea' }),
      ];
      const result = aggregateMedicalByWeek(events);
      expect(result).toHaveLength(1);
      expect(result[0]['Vomiting']).toBe(2);
      expect(result[0]['Diarrhea']).toBe(1);
    });
  });
});
