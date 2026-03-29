import { mkConfig, generateCsv, download } from 'export-to-csv';

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
    date: e.date,
    time,
    type: e.eventType,
    details,
    severity: e.data?.severity || '',
    notes: e.notes || '',
    enteredBy: e.enteredBy || '',
  };
}

export function exportEventsCsv(events: any[], dogName: string, startDate: string, endDate: string) {
  const rows = events.map(formatEvent);
  const config = mkConfig({
    filename: `${dogName}-events-${startDate}-to-${endDate}`,
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
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    status: m.status,
    startedAt: m.startedAt ? new Date(m.startedAt).toLocaleDateString() : '',
    stoppedAt: m.stoppedAt ? new Date(m.stoppedAt).toLocaleDateString() : '',
    notes: m.notes || '',
  }));
  const config = mkConfig({
    filename: `${dogName}-medications`,
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
