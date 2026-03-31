import { useState } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import { DAY_RATING_EMOJIS, NIGHT_RATING_EMOJIS, POTTY_LOCATIONS } from '../lib/constants';
import { localInputToISO, localDateInTz } from '../lib/timezone';

interface Props {
  date?: string;
  onClose: () => void;
  onSaved: () => void;
}

const MEDICAL_TYPES = ['Diarrhea', 'Vomiting', 'Seizure', 'Limping', 'Loss of appetite', 'Excessive thirst', 'Coughing', 'Sneezing', 'Eye discharge', 'Ear infection'];
const BEHAVIOR_TYPES = ['Excessive licking', 'Extreme tiredness', 'Pacing', 'Whining', 'Hiding', 'Confusion', 'Loss of interest'];

export default function DailySummaryForm({ date, onClose, onSaved }: Props) {
  const { selectedDog } = useDog();
  const api = useApi();
  const today = date || localDateInTz();

  const [rating, setRating] = useState(3);
  const [accidents, setAccidents] = useState<{ type: 'pee' | 'poop'; location: string }[]>([]);
  const [medicals, setMedicals] = useState<{ medicalType: string; severity: string }[]>([]);
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [nightRating, setNightRating] = useState(3);
  const [nightNote, setNightNote] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selectedDog) return;
    setLoading(true);
    try {
      const dogPath = `/dogs/${selectedDog.dogId}/events`;
      // Use noon in the user's timezone for the date, so the stored date is correct
      const occurredAt = localInputToISO(`${today}T12:00`);
      const localDate = today;
      const promises: Promise<any>[] = [];

      // Day rating
      promises.push(api.post(dogPath, { eventType: 'DAY_RATING', data: { rating }, notes, occurredAt, localDate }));

      // Accidents
      for (const a of accidents) {
        if (a.location) promises.push(api.post(dogPath, { eventType: 'ACCIDENT', data: a, occurredAt, localDate }));
      }

      // Medical events
      for (const m of medicals) {
        promises.push(api.post(dogPath, { eventType: 'MEDICAL', data: m, occurredAt, localDate }));
      }

      // Behaviors
      for (const b of behaviors) {
        promises.push(api.post(dogPath, { eventType: 'BEHAVIOR', data: { behaviorType: b }, occurredAt, localDate }));
      }

      // Night note
      if (nightRating) {
        promises.push(api.post(dogPath, { eventType: 'NIGHT_NOTE', data: { rating: nightRating, description: nightNote || `Night rating: ${nightRating}/5` }, occurredAt, localDate }));
      }

      await Promise.all(promises);
      onSaved();
      onClose();
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto mb-0" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Daily Summary — {today}</h3>

        <div className="space-y-5">
          {/* Day Rating */}
          <section>
            <label className="text-sm font-medium text-gray-700">Day Rating</label>
            <div className="flex justify-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setRating(r)}
                  className={`w-11 h-11 rounded-full text-xl border-2 ${rating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                  {DAY_RATING_EMOJIS[r]}
                </button>
              ))}
            </div>
          </section>

          {/* Potty */}
          <section>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">🚽 Potty</label>
              <button onClick={() => setAccidents([...accidents, { type: 'pee', location: 'Inside' }])}
                className="text-blue-600 text-sm">+ Add</button>
            </div>
            {accidents.map((a, i) => (
              <div key={i} className="flex gap-2 mt-2 items-center">
                <select value={a.type} onChange={e => { const n = [...accidents]; n[i].type = e.target.value as any; setAccidents(n); }}
                  className="border rounded-lg px-2 py-2 text-sm">
                  <option value="pee">💧 Pee</option>
                  <option value="poop">💩 Poop</option>
                </select>
                <div className="flex gap-1 flex-1">
                  {POTTY_LOCATIONS.map(loc => (
                    <button key={loc} type="button" onClick={() => { const n = [...accidents]; n[i].location = loc; setAccidents(n); }}
                      className={`flex-1 py-2 rounded-lg border text-xs ${a.location === loc ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                      {loc === 'Inside' ? '🏠' : '🌳'} {loc}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAccidents(accidents.filter((_, j) => j !== i))} className="text-red-400 text-sm">✕</button>
              </div>
            ))}
          </section>

          {/* Medical */}
          <section>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">🏥 Medical Events</label>
              <button onClick={() => setMedicals([...medicals, { medicalType: MEDICAL_TYPES[0], severity: '' }])}
                className="text-blue-600 text-sm">+ Add</button>
            </div>
            {medicals.map((m, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <select value={m.medicalType} onChange={e => { const n = [...medicals]; n[i].medicalType = e.target.value; setMedicals(n); }}
                  className="flex-1 border rounded-lg px-2 py-2 text-sm">
                  {MEDICAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={m.severity} onChange={e => { const n = [...medicals]; n[i].severity = e.target.value; setMedicals(n); }}
                  className="border rounded-lg px-2 py-2 text-sm">
                  <option value="">Severity</option>
                  <option>mild</option><option>moderate</option><option>severe</option>
                </select>
                <button onClick={() => setMedicals(medicals.filter((_, j) => j !== i))} className="text-red-400 text-sm">✕</button>
              </div>
            ))}
          </section>

          {/* Behaviors */}
          <section>
            <label className="text-sm font-medium text-gray-700">🐕 Behavioral Changes</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {BEHAVIOR_TYPES.map(b => (
                <button key={b} onClick={() => setBehaviors(behaviors.includes(b) ? behaviors.filter(x => x !== b) : [...behaviors, b])}
                  className={`px-3 py-1 rounded-full text-sm border ${behaviors.includes(b) ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                  {b}
                </button>
              ))}
            </div>
          </section>

          {/* Night Rating */}
          <section>
            <label className="text-sm font-medium text-gray-700">🌙 Night Rating</label>
            <div className="flex justify-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button" onClick={() => setNightRating(r)}
                  className={`w-11 h-11 rounded-full text-xl border-2 ${nightRating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                  {NIGHT_RATING_EMOJIS[r]}
                </button>
              ))}
            </div>
            <textarea placeholder="Night notes (optional)" value={nightNote} onChange={e => setNightNote(e.target.value)}
              rows={2} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />
          </section>

          {/* General Notes */}
          <section>
            <label className="text-sm font-medium text-gray-700">📝 General Notes</label>
            <textarea placeholder="Anything else?" value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />
          </section>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Daily Summary'}
          </button>
        </div>
      </div>
    </div>
  );
}
