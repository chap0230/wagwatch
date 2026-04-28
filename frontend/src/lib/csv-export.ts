import { mkConfig, generateCsv, download } from 'export-to-csv';

/**
 * Neutralize CSV formula injection.
 *
 * Spreadsheet apps (Excel, Sheets, Numbers) interpret cells that start with
 * `= + - @ \t \r` as formulas. A malicious note like `=HYPERLINK(...)` will
 * execute when someone opens the export. Prefix those with a single quote
 * (OWASP-recommended mitigation) so the cell displays as text.
 */
function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.length === 0) return s;
  const first = s.charCodeAt(0);
  // '=' 61, '+' 43, '-' 45, '@' 64, '\t' 9, '\r' 13
  if (first === 61 || first === 43 || first === 45 || first === 64 || first === 9 || first === 13) {
    return `'${s}`;
  }
  return s;
}

// Sanitize a filename component — CSV export libraries pass the filename
// through; strip path separators and control characters.
function sanitizeFilename(s: string): string {
  return s.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 100);
}

function formatEvent(e: any): Record<string, string> {
  const time = new Date(e.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  let details = '';
  switch (e.eventType) {
    case 'ACCIDENT': details = `${e.data.type} — ${e.data.location}`; break;
    case 'MEDICAL': details = e.data.medicalType; break;
    case 'BEHAVIOR': details = e.data.behaviorType; break;
    case 'NIGHT_NOTE': details = e.data.description; break;
    case 'DAY_RATING': details = `Rating: ${e.data.rating}/5`; break;
  }
  return {
    date: sanitizeCell(e.date),
    time: sanitizeCell(time),
    type: sanitizeCell(e.eventType),
    details: sanitizeCell(details),
    severity: sanitizeCell(e.data?.severity || ''),
    notes: sanitizeCell(e.notes || ''),
    enteredBy: sanitizeCell(e.enteredBy || ''),
  };
}

export function exportEventsCsv(events: any[], dogName: string, startDate: string, endDate: string) {
  const rows = events.map(formatEvent);
  const config = mkConfig({
    filename: sanitizeFilename(`${dogName}-events-${startDate}-to-${endDate}`),
    columnHeaders: [
      { key: 'date', displayLabel: 'Date' },
      { key: 'time', displayLabel: 'Time' },
      { key: 'type', displayLabel: 'Event Type' },
      { key: 'details', displayLabel: 'Details' },
      { key: 'severity', displayLabel: 'Severity' },
      { key: 'notes', displayLabel: 'Notes' },
      { key: 'enteredBy', displayLabel: 'Entered By' },
    ],
  });
  const csv = generateCsv(config)(rows);
  download(config)(csv);
}

export function exportMedicationsCsv(meds: any[], dogName: string) {
  const rows = meds.map(m => ({
    name: sanitizeCell(m.name),
    dosage: sanitizeCell(m.dosage),
    frequency: sanitizeCell(m.frequency),
    status: sanitizeCell(m.status),
    startedAt: sanitizeCell(m.startedAt ? new Date(m.startedAt).toLocaleDateString() : ''),
    stoppedAt: sanitizeCell(m.stoppedAt ? new Date(m.stoppedAt).toLocaleDateString() : ''),
    notes: sanitizeCell(m.notes || ''),
  }));
  const config = mkConfig({
    filename: sanitizeFilename(`${dogName}-medications`),
    columnHeaders: [
      { key: 'name', displayLabel: 'Medication' },
      { key: 'dosage', displayLabel: 'Dosage' },
      { key: 'frequency', displayLabel: 'Frequency' },
      { key: 'status', displayLabel: 'Status' },
      { key: 'startedAt', displayLabel: 'Started' },
      { key: 'stoppedAt', displayLabel: 'Stopped' },
      { key: 'notes', displayLabel: 'Notes' },
    ],
  });
  const csv = generateCsv(config)(rows);
  download(config)(csv);
}

// Exported for unit testing.
export const __test = { sanitizeCell, sanitizeFilename };
