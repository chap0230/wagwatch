import { useState } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import { exportEventsCsv, exportMedicationsCsv } from '../lib/csv-export';
import { exportVetReportPdf } from '../lib/pdf-export';

interface Props {
  events: any[];
  startDate: string;
  endDate: string;
}

export default function ExportBar({ events, startDate, endDate }: Props) {
  const { selectedDog } = useDog();
  const api = useApi();
  const [loading, setLoading] = useState('');

  if (!selectedDog) return null;

  async function handleCsv() {
    setLoading('csv');
    exportEventsCsv(events, selectedDog!.name, startDate, endDate);
    setLoading('');
  }

  async function handleMedsCsv() {
    setLoading('meds');
    try {
      const meds = await api.get(`/dogs/${selectedDog!.dogId}/medications?status=ALL`);
      exportMedicationsCsv(meds, selectedDog!.name);
    } catch { /* ignore */ }
    setLoading('');
  }

  async function handlePdf() {
    setLoading('pdf');
    try {
      const [dog, meds] = await Promise.all([
        api.get(`/dogs/${selectedDog!.dogId}`),
        api.get(`/dogs/${selectedDog!.dogId}/medications?status=ALL`),
      ]);
      exportVetReportPdf(dog, events, meds, startDate, endDate);
    } catch { /* ignore */ }
    setLoading('');
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={handleCsv} disabled={!!loading}
        className="px-3 py-1.5 text-sm border rounded-lg text-gray-700 disabled:opacity-50">
        {loading === 'csv' ? '...' : '📄 Export CSV'}
      </button>
      <button onClick={handleMedsCsv} disabled={!!loading}
        className="px-3 py-1.5 text-sm border rounded-lg text-gray-700 disabled:opacity-50">
        {loading === 'meds' ? '...' : '💊 Meds CSV'}
      </button>
      <button onClick={handlePdf} disabled={!!loading}
        className="px-3 py-1.5 text-sm border rounded-lg bg-blue-600 text-white disabled:opacity-50">
        {loading === 'pdf' ? '...' : '🩺 Vet Report PDF'}
      </button>
    </div>
  );
}
