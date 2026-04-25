import { useState } from 'react';
import { DAY_RATING_EMOJIS } from '../lib/constants';
import { useApi } from '../lib/api';
import { useDog } from '../contexts/DogContext';
import { localInputToISO } from '../lib/timezone';

interface Props {
  yesterday: string; // YYYY-MM-DD
  onDismiss: () => void;
  onSaved: () => void;
}

export default function DayRatingPrompt({ yesterday, onDismiss, onSaved }: Props) {
  const api = useApi();
  const { selectedDog } = useDog();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(3);
  const [saving, setSaving] = useState(false);

  const label = new Date(yesterday + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  async function handleSave() {
    if (!selectedDog) return;
    setSaving(true);
    try {
      const occurredAt = localInputToISO(`${yesterday}T12:00`);
      await api.post(`/dogs/${selectedDog.dogId}/events`, {
        eventType: 'DAY_RATING',
        data: { rating },
        occurredAt,
        localDate: yesterday,
      });
      onSaved();
      setOpen(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  if (open) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-4" onClick={() => setOpen(false)}>
        <div className="bg-white w-full max-w-sm rounded-2xl p-5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Rate {label}</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 text-lg">✕</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">How was yesterday overall?</p>
          <div className="flex justify-center gap-3 mb-5">
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} onClick={() => setRating(r)}
                className={`w-12 h-12 rounded-full text-2xl border-2 transition-all ${rating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-200'}`}>
                {DAY_RATING_EMOJIS[r]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 py-2.5 border rounded-lg text-sm text-gray-600">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Rating'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner prompt
  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">⭐</span>
        <div>
          <p className="text-sm font-medium text-amber-900">Rate {label}?</p>
          <p className="text-xs text-amber-700">No day rating logged yet</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)}
          className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium active:bg-amber-600">
          Rate
        </button>
        <button onClick={onDismiss} className="text-amber-400 text-lg leading-none px-1">✕</button>
      </div>
    </div>
  );
}
