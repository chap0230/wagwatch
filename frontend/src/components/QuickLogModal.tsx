import { useState } from 'react';
import { DAY_RATING_EMOJIS, NIGHT_RATING_EMOJIS, POTTY_LOCATIONS } from '../lib/constants';

type EventType = 'ACCIDENT' | 'MEDICAL' | 'BEHAVIOR' | 'NIGHT_NOTE' | 'DAY_RATING';

interface QuickLogProps {
  onSubmit: (event: { eventType: EventType; data: any; notes?: string; occurredAt?: string }) => Promise<void>;
}

const EVENT_OPTIONS: { type: EventType; icon: string; label: string }[] = [
  { type: 'ACCIDENT', icon: '🚽', label: 'Potty' },
  { type: 'MEDICAL', icon: '🏥', label: 'Medical' },
  { type: 'BEHAVIOR', icon: '🐕', label: 'Behavior' },
  { type: 'NIGHT_NOTE', icon: '🌙', label: 'Night Rating' },
  { type: 'DAY_RATING', icon: '⭐', label: 'Day Rating' },
];

const MEDICAL_TYPES = ['Diarrhea', 'Vomiting', 'Seizure', 'Limping', 'Loss of appetite', 'Excessive thirst', 'Coughing', 'Sneezing', 'Eye discharge', 'Ear infection'];
const BEHAVIOR_TYPES = ['Excessive licking', 'Extreme tiredness', 'Pacing', 'Whining', 'Hiding', 'Confusion', 'Loss of interest'];

export default function QuickLogModal({ onSubmit }: QuickLogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [accidentType, setAccidentType] = useState<'pee' | 'poop'>('pee');
  const [location, setLocation] = useState<string>('Inside');
  const [medicalType, setMedicalType] = useState(MEDICAL_TYPES[0]);
  const [customMedical, setCustomMedical] = useState('');
  const [severity, setSeverity] = useState('');
  const [behaviorType, setBehaviorType] = useState(BEHAVIOR_TYPES[0]);
  const [customBehavior, setCustomBehavior] = useState('');
  const [nightRating, setNightRating] = useState(3);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  function reset() {
    setStep('select');
    setEventType(null);
    setLocation('Inside');
    setCustomMedical('');
    setSeverity('');
    setCustomBehavior('');
    setNightRating(3);
    setRating(3);
    setNotes('');
    setLoading(false);
  }

  function close() { setOpen(false); reset(); }
  function selectType(type: EventType) { setEventType(type); setStep('form'); }

  async function handleSubmit() {
    if (!eventType) return;
    setLoading(true);
    try {
      let data: any;
      switch (eventType) {
        case 'ACCIDENT': data = { type: accidentType, location }; break;
        case 'MEDICAL': data = { medicalType: customMedical || medicalType, ...(severity && { severity }) }; break;
        case 'BEHAVIOR': data = { behaviorType: customBehavior || behaviorType }; break;
        case 'NIGHT_NOTE': data = { rating: nightRating, description: notes || `Night rating: ${nightRating}/5` }; break;
        case 'DAY_RATING': data = { rating }; break;
      }
      const submitNotes = eventType === 'NIGHT_NOTE' ? undefined : (notes || undefined);
      await onSubmit({ eventType, data, notes: submitNotes });
      close();
    } catch { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-2xl z-50 active:scale-95">
        +
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={close}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto mb-0" onClick={e => e.stopPropagation()}>
        {step === 'select' ? (
          <>
            <h3 className="text-lg font-semibold mb-4">Log an event</h3>
            <div className="grid grid-cols-3 gap-3">
              {EVENT_OPTIONS.map(opt => (
                <button key={opt.type} onClick={() => selectType(opt.type)}
                  className="flex flex-col items-center p-4 border rounded-xl active:bg-gray-50">
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-sm mt-1">{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setStep('select')} className="text-blue-600 text-sm">← Back</button>
              <h3 className="font-semibold">{EVENT_OPTIONS.find(o => o.type === eventType)?.label}</h3>
              <div className="w-10" />
            </div>

            <div className="space-y-4">
              {eventType === 'ACCIDENT' && (
                <>
                  <div className="flex gap-2">
                    {(['pee', 'poop'] as const).map(t => (
                      <button key={t} onClick={() => setAccidentType(t)}
                        className={`flex-1 py-3 rounded-lg border text-center capitalize ${accidentType === t ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                        {t === 'pee' ? '💧' : '💩'} {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {POTTY_LOCATIONS.map(loc => (
                      <button key={loc} onClick={() => setLocation(loc)}
                        className={`flex-1 py-3 rounded-lg border text-center ${location === loc ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                        {loc === 'Inside' ? '🏠' : '🌳'} {loc}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {eventType === 'MEDICAL' && (
                <>
                  <select value={medicalType} onChange={e => { setMedicalType(e.target.value); setCustomMedical(''); }}
                    className="w-full px-3 py-3 border rounded-lg">
                    {MEDICAL_TYPES.map(t => <option key={t}>{t}</option>)}
                    <option value="__custom">Other (custom)</option>
                  </select>
                  {medicalType === '__custom' && (
                    <input placeholder="Describe the event" value={customMedical} onChange={e => setCustomMedical(e.target.value)}
                      className="w-full px-3 py-3 border rounded-lg" />
                  )}
                  <div className="flex gap-2">
                    {['mild', 'moderate', 'severe'].map(s => (
                      <button key={s} onClick={() => setSeverity(severity === s ? '' : s)}
                        className={`flex-1 py-2 rounded-lg border capitalize text-sm ${severity === s ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {eventType === 'BEHAVIOR' && (
                <>
                  <select value={behaviorType} onChange={e => { setBehaviorType(e.target.value); setCustomBehavior(''); }}
                    className="w-full px-3 py-3 border rounded-lg">
                    {BEHAVIOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    <option value="__custom">Other (custom)</option>
                  </select>
                  {behaviorType === '__custom' && (
                    <input placeholder="Describe the behavior" value={customBehavior} onChange={e => setCustomBehavior(e.target.value)}
                      className="w-full px-3 py-3 border rounded-lg" />
                  )}
                </>
              )}

              {eventType === 'NIGHT_NOTE' && (
                <>
                  <p className="text-sm text-gray-500 text-center">How was the night?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setNightRating(r)}
                        className={`w-12 h-12 rounded-full text-xl border-2 ${nightRating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                        {NIGHT_RATING_EMOJIS[r]}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {eventType === 'DAY_RATING' && (
                <>
                  <p className="text-sm text-gray-500 text-center">How was the day?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setRating(r)}
                        className={`w-12 h-12 rounded-full text-xl border-2 ${rating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                        {DAY_RATING_EMOJIS[r]}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} className="w-full px-3 py-3 border rounded-lg" />

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
