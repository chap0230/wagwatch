import { describe, it, expect, vi } from 'vitest';

// Mock jsPDF as a class
vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(function(this: any) {
    this.internal = { pageSize: { getWidth: () => 210 } };
    this.setFontSize = vi.fn();
    this.text = vi.fn();
    this.save = vi.fn();
    this.lastAutoTable = { finalY: 100 };
  });
  return { default: MockJsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn().mockImplementation((doc: any) => { doc.lastAutoTable = { finalY: 100 }; }),
}));

import { exportVetReportPdf } from '../lib/pdf-export';

describe('pdf-export', () => {
  it('generates PDF without error', () => {
    const dog = { name: 'Bella', breed: 'Lab', dateOfBirth: '2009-03-15', weight: 45, conditions: ['Arthritis'], allergies: [] };
    const events = [
      { eventType: 'ACCIDENT', date: '2026-03-26', occurredAt: '2026-03-26T10:00:00Z', data: { type: 'pee', location: 'hall' }, notes: '' },
      { eventType: 'DAY_RATING', date: '2026-03-26', occurredAt: '2026-03-26T20:00:00Z', data: { rating: 4 } },
    ];
    const meds = [{ name: 'Gabapentin', dosage: '100mg', frequency: 'daily', status: 'ACTIVE', startedAt: '2026-01-01T00:00:00Z' }];
    expect(() => exportVetReportPdf(dog, events, meds, '2026-03-01', '2026-03-31')).not.toThrow();
  });

  it('handles empty events and medications', () => {
    const dog = { name: 'Bella', breed: 'Lab', dateOfBirth: '2009-03-15' };
    expect(() => exportVetReportPdf(dog, [], [], '2026-03-01', '2026-03-31')).not.toThrow();
  });
});
