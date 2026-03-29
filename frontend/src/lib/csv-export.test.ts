import { describe, it, expect, vi } from 'vitest';

vi.mock('export-to-csv', () => ({
  mkConfig: vi.fn().mockReturnValue({}),
  generateCsv: vi.fn().mockReturnValue(() => 'csv-data'),
  download: vi.fn().mockReturnValue(vi.fn()),
}));

import { exportEventsCsv, exportMedicationsCsv } from '../lib/csv-export';

describe('csv-export', () => {
  it('exportEventsCsv processes events without error', () => {
    const events = [
      { eventType: 'ACCIDENT', date: '2026-03-26', occurredAt: '2026-03-26T10:00:00Z', data: { type: 'pee', location: 'hall' }, notes: 'test', enteredBy: 'u1' },
      { eventType: 'DAY_RATING', date: '2026-03-26', occurredAt: '2026-03-26T20:00:00Z', data: { rating: 4 }, enteredBy: 'u1' },
      { eventType: 'MEDICAL', date: '2026-03-26', occurredAt: '2026-03-26T11:00:00Z', data: { medicalType: 'Vomiting', severity: 'mild' }, enteredBy: 'u1' },
      { eventType: 'BEHAVIOR', date: '2026-03-26', occurredAt: '2026-03-26T14:00:00Z', data: { behaviorType: 'Pacing' }, enteredBy: 'u1' },
      { eventType: 'NIGHT_NOTE', date: '2026-03-26', occurredAt: '2026-03-26T06:00:00Z', data: { description: 'restless' }, enteredBy: 'u1' },
    ];
    expect(() => exportEventsCsv(events, 'Bella', '2026-03-01', '2026-03-31')).not.toThrow();
  });

  it('exportMedicationsCsv processes medications without error', () => {
    const meds = [
      { name: 'Gabapentin', dosage: '100mg', frequency: 'daily', status: 'ACTIVE', startedAt: '2026-01-01T00:00:00Z', stoppedAt: null, notes: '' },
    ];
    expect(() => exportMedicationsCsv(meds, 'Bella')).not.toThrow();
  });
});
