import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DogProfile {
  name: string;
  breed: string;
  dateOfBirth: string;
  weight?: number;
  conditions?: string[];
  allergies?: string[];
  vetName?: string;
  vetPhone?: string;
}

export function exportVetReportPdf(
  dog: DogProfile,
  events: any[],
  medications: any[],
  startDate: string,
  endDate: string,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text(`Health Report: ${dog.name}`, pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  doc.text(`${startDate} to ${endDate}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Dog Profile
  doc.setFontSize(13);
  doc.text('Dog Profile', 14, y);
  y += 6;
  doc.setFontSize(10);
  const age = Math.floor((Date.now() - new Date(dog.dateOfBirth).getTime()) / 31557600000);
  const profileLines = [
    `Name: ${dog.name}`,
    `Breed: ${dog.breed}`,
    `Age: ${age} years`,
    dog.weight ? `Weight: ${dog.weight} lbs` : '',
    dog.conditions?.length ? `Conditions: ${dog.conditions.join(', ')}` : '',
    dog.allergies?.length ? `Allergies: ${dog.allergies.join(', ')}` : '',
    dog.vetName ? `Vet: ${dog.vetName}` : '',
    dog.vetPhone ? `Vet Phone: ${dog.vetPhone}` : '',
  ].filter(Boolean);
  profileLines.forEach(line => { doc.text(line, 14, y); y += 5; });
  y += 6;

  // Current Medications
  const activeMeds = medications.filter(m => m.status === 'ACTIVE');
  if (activeMeds.length) {
    doc.setFontSize(13);
    doc.text('Current Medications', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Medication', 'Dosage', 'Frequency', 'Started']],
      body: activeMeds.map(m => [m.name, m.dosage, m.frequency, new Date(m.startedAt).toLocaleDateString()]),
      styles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Summary Stats
  const accidents = events.filter(e => e.eventType === 'ACCIDENT').length;
  const medicals = events.filter(e => e.eventType === 'MEDICAL').length;
  const behaviors = events.filter(e => e.eventType === 'BEHAVIOR').length;
  const ratings = events.filter(e => e.eventType === 'DAY_RATING');
  const avgRating = ratings.length ? (ratings.reduce((s, e) => s + e.data.rating, 0) / ratings.length).toFixed(1) : 'N/A';

  doc.setFontSize(13);
  doc.text('Summary', 14, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Accidents', String(accidents)],
      ['Total Medical Events', String(medicals)],
      ['Total Behavioral Changes', String(behaviors)],
      ['Average Day Rating', String(avgRating)],
      ['Days Tracked', String(ratings.length)],
    ],
    styles: { fontSize: 9 },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Event Log
  const logEvents = events.filter(e => e.eventType !== 'DAY_RATING').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  if (logEvents.length) {
    doc.setFontSize(13);
    doc.text('Event Log', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Time', 'Type', 'Details', 'Notes']],
      body: logEvents.map(e => {
        let details = '';
        switch (e.eventType) {
          case 'ACCIDENT': details = `${e.data.type} — ${e.data.location}`; break;
          case 'MEDICAL': details = `${e.data.medicalType}${e.data.severity ? ` (${e.data.severity})` : ''}`; break;
          case 'BEHAVIOR': details = e.data.behaviorType; break;
          case 'NIGHT_NOTE': details = e.data.description; break;
        }
        return [
          e.date,
          new Date(e.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          e.eventType.replace('_', ' '),
          details,
          e.notes || '',
        ];
      }),
      styles: { fontSize: 8 },
      margin: { left: 14 },
      columnStyles: { 3: { cellWidth: 50 }, 4: { cellWidth: 40 } },
    });
  }

  doc.save(`${dog.name}-health-report-${startDate}-to-${endDate}.pdf`);
}
