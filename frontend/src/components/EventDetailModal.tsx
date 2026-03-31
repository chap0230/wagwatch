import { useState } from 'react';
import { DAY_RATING_EMOJIS, NIGHT_RATING_EMOJIS, POTTY_LOCATIONS } from '../lib/constants';
import { useApi } from '../lib/api';
import { formatInTz, isoToLocalInput, localInputToISO } from '../lib/timezone';

interface Props {
  event: any;
  onClose: () => void;
  onUpdated: () => void;
  userMap?: Record<string, string>; // userId -> display name/email
}

const MEDICAL_TYPES = ['Diarrhea', 'Vomiting', 'Seizure', 'Limping', 'Loss of appetite', 'Excessive thirst', 'Coughing', 'Sneezing', 'Eye discharge', 'Ear infection'];
const BEHAVIOR_TYPES = ['Excessive licking', 'Extreme tiredness', 'Pacing', 'Whining', 'Hiding', 'Confusion', 'Loss of interest'];

function formatDateTime(iso: string) {
  return formatInTz(iso, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EventDetailModal({ event, onClose, onUpdated, userMap }: Props) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({ ...event.data });
  const [notes, setNotes] = useState(event.notes || '');
  const [occurredAt, setOccurredAt] = useState(() => isoToLocalInput(event.occurredAt));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const enteredByName = userMap?.[event.enteredBy] || event.enteredBy;

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await api.put(`/dogs/${event.dogId}/events/${encodeURIComponent(event.eventId)}`, {
        data,
        notes: notes || undefined,
        occurredAt: localInputToISO(occurredAt),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this entry?')) return;
    setDeleting(true);
    try {
      await api.del(`/dogs/${event.dogId}/events/${encodeURIComponent(event.eventId)}`);
      onUpdated();
      onClose();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{event.eventType === 'ACCIDENT' ? 'Potty' : event.eventType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).replace('Day Rating', 'Day Rating').replace('Night Note', 'Night Rating')}</h3>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>

        {editing ? (
          <div className="space-y-4">
            {/* Editable fields per type */}
            {event.eventType === 'ACCIDENT' && (
              <>
                <div className="flex gap-2">
                  {(['pee', 'poop'] as const).map(t => (
                    <button key={t} onClick={() => setData({ ...data, type: t })}
                      className={`flex-1 py-2 rounded-lg border capitalize ${data.type === t ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                      {t === 'pee' ? '💧' : '💩'} {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {POTTY_LOCATIONS.map(loc => (
                    <button key={loc} onClick={() => setData({ ...data, location: loc })}
                      className={`flex-1 py-2 rounded-lg border ${data.location === loc ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                      {loc === 'Inside' ? '🏠' : '🌳'} {loc}
                    </button>
                  ))}
                </div>
              </>
            )}
            {event.eventType === 'MEDICAL' && (
              <>
                <select value={data.medicalType} onChange={e => setData({ ...data, medicalType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {MEDICAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="flex gap-2">
                  {['mild', 'moderate', 'severe'].map(s => (
                    <button key={s} onClick={() => setData({ ...data, severity: data.severity === s ? '' : s })}
                      className={`flex-1 py-2 rounded-lg border capitalize text-sm ${data.severity === s ? 'bg-blue-50 border-blue-600 text-blue-600' : ''}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {event.eventType === 'BEHAVIOR' && (
              <select value={data.behaviorType} onChange={e => setData({ ...data, behaviorType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                {BEHAVIOR_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            )}
            {event.eventType === 'NIGHT_NOTE' && (
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setData({ ...data, rating: r })}
                    className={`w-11 h-11 rounded-full text-xl border-2 ${data.rating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                    {NIGHT_RATING_EMOJIS[r]}
                  </button>
                ))}
              </div>
            )}
            {event.eventType === 'DAY_RATING' && (
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setData({ ...data, rating: r })}
                    className={`w-11 h-11 rounded-full text-xl border-2 ${data.rating === r ? 'bg-blue-50 border-blue-600 scale-110' : 'border-gray-300'}`}>
                    {DAY_RATING_EMOJIS[r]}
                  </button>
                ))}
              </div>
            )}
            <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date &amp; Time</label>
              <input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saveError && <p className="text-red-500 text-xs text-center">{saveError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Read-only detail view */}
            {event.eventType === 'ACCIDENT' && (
              <>
                <Detail label="Type" value={`${event.data.type === 'pee' ? '💧 Pee' : '💩 Poop'}`} />
                <Detail label="Location" value={`${event.data.location === 'Inside' ? '🏠' : '🌳'} ${event.data.location}`} />
              </>
            )}
            {event.eventType === 'MEDICAL' && (
              <>
                <Detail label="Event" value={event.data.medicalType} />
                {event.data.severity && <Detail label="Severity" value={event.data.severity} />}
              </>
            )}
            {event.eventType === 'BEHAVIOR' && (
              <Detail label="Behavior" value={event.data.behaviorType} />
            )}
            {event.eventType === 'NIGHT_NOTE' && (
              <>
                {event.data.rating && <Detail label="Rating" value={`${NIGHT_RATING_EMOJIS[event.data.rating]} ${event.data.rating}/5`} />}
                {event.data.description && <Detail label="Notes" value={event.data.description} />}
              </>
            )}
            {event.eventType === 'DAY_RATING' && (
              <Detail label="Rating" value={`${DAY_RATING_EMOJIS[event.data.rating]} ${event.data.rating}/5`} />
            )}
            {event.notes && <Detail label="Notes" value={event.notes} />}
            <Detail label="Time" value={formatDateTime(event.occurredAt)} />
            <Detail label="Entered by" value={enteredByName} />
            <Detail label="Date" value={event.date} />

            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(true)}
                className="flex-1 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium">
                Edit
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="py-2 px-4 border-2 border-red-300 text-red-500 rounded-lg text-sm font-medium disabled:opacity-50">
                {deleting ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
