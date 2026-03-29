import { useState, useEffect, useCallback } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';

export default function ProfilePage() {
  const { selectedDog, dogs, refreshDogs } = useDog();
  const api = useApi();
  const [dog, setDog] = useState<any>(null);
  const [meds, setMeds] = useState<any[]>([]);
  const [showStopped, setShowStopped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddDog, setShowAddDog] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(file: File) {
    if (!selectedDog) return;
    setUploading(true);
    try {
      const contentType = file.type || 'image/jpeg';
      const { uploadUrl, key } = await api.post(`/dogs/${selectedDog.dogId}/photo-upload-url`, { contentType });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
      await api.put(`/dogs/${selectedDog.dogId}`, { photoKey: key });
      await fetchDog();
    } catch { /* ignore */ }
    finally { setUploading(false); }
  }

  const fetchDog = useCallback(async () => {
    if (!selectedDog) return;
    try {
      const [d, m] = await Promise.all([
        api.get(`/dogs/${selectedDog.dogId}`),
        api.get(`/dogs/${selectedDog.dogId}/medications?status=ALL`),
      ]);
      setDog(d);
      setMeds(m);
    } catch { /* ignore */ }
  }, [selectedDog?.dogId]);

  useEffect(() => { fetchDog(); }, [fetchDog]);

  async function handleSaveEdit() {
    if (!selectedDog) return;
    setLoading(true);
    try {
      await api.put(`/dogs/${selectedDog.dogId}`, editForm);
      setEditing(false);
      await fetchDog();
      await refreshDogs();
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleStopMed(medId: string) {
    if (!selectedDog || !confirm('Stop this medication?')) return;
    await api.put(`/dogs/${selectedDog.dogId}/medications/${medId}/stop`, {});
    await fetchDog();
  }

  const activeMeds = meds.filter(m => m.status === 'ACTIVE');
  const stoppedMeds = meds.filter(m => m.status === 'STOPPED');

  function calcAge(dob: string) {
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
    return `${years} years old`;
  }

  if (!selectedDog) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🐾</p>
        <p className="text-gray-500 mb-4">No dogs yet</p>
        <button onClick={() => setShowAddDog(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add Your Dog</button>
        {showAddDog && <AddDogForm onClose={() => setShowAddDog(false)} onSaved={() => { setShowAddDog(false); refreshDogs(); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dog Profile */}
      <section className="bg-white rounded-xl p-4 border">
        <div className="flex items-center gap-4 mb-4">
          <label className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl overflow-hidden cursor-pointer relative">
            {dog?.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" /> : '🐕'}
            {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full"><span className="text-white text-xs">...</span></div>}
            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
            {!uploading && <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">📷</div>}
          </label>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{dog?.name || selectedDog.name}</h2>
            <p className="text-sm text-gray-500">{dog?.breed} · {dog?.dateOfBirth && calcAge(dog.dateOfBirth)}</p>
          </div>
          <button onClick={() => { setEditing(!editing); setEditForm(dog || {}); }} className="text-blue-600 text-sm">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            {['name', 'breed', 'dateOfBirth', 'weight', 'vetName', 'vetPhone', 'vetEmail'].map(field => (
              <div key={field}>
                <label className="text-xs text-gray-500 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input value={editForm[field] || ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                  type={field === 'dateOfBirth' ? 'date' : field === 'weight' ? 'number' : 'text'}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500">Conditions (comma-separated)</label>
              <input value={(editForm.conditions || []).join(', ')}
                onChange={e => setEditForm({ ...editForm, conditions: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Allergies (comma-separated)</label>
              <input value={(editForm.allergies || []).join(', ')}
                onChange={e => setEditForm({ ...editForm, allergies: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button onClick={handleSaveEdit} disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : dog && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {dog.weight && <Detail label="Weight" value={`${dog.weight} lbs`} />}
            {dog.vetName && <Detail label="Vet" value={dog.vetName} />}
            {dog.vetPhone && <Detail label="Vet Phone" value={dog.vetPhone} />}
            {dog.vetEmail && <Detail label="Vet Email" value={dog.vetEmail} />}
            {dog.conditions?.length > 0 && <Detail label="Conditions" value={dog.conditions.join(', ')} />}
            {dog.allergies?.length > 0 && <Detail label="Allergies" value={dog.allergies.join(', ')} />}
          </div>
        )}
      </section>

      {/* Medications */}
      <section className="bg-white rounded-xl p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">💊 Medications</h3>
          <button onClick={() => setShowAddMed(true)} className="text-blue-600 text-sm">+ Add</button>
        </div>

        {activeMeds.length === 0 ? (
          <p className="text-gray-400 text-sm">No active medications</p>
        ) : (
          <div className="space-y-2">
            {activeMeds.map(m => (
              <div key={m.medicationId} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.dosage} · {m.frequency}</p>
                  <p className="text-xs text-gray-400">Started {new Date(m.startedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleStopMed(m.medicationId)} className="text-red-500 text-xs px-2 py-1 border border-red-200 rounded-lg">Stop</button>
              </div>
            ))}
          </div>
        )}

        {stoppedMeds.length > 0 && (
          <>
            <button onClick={() => setShowStopped(!showStopped)} className="text-sm text-gray-500 mt-3">
              {showStopped ? '▼' : '▶'} Stopped ({stoppedMeds.length})
            </button>
            {showStopped && (
              <div className="space-y-2 mt-2 opacity-60">
                {stoppedMeds.map(m => (
                  <div key={m.medicationId} className="py-2 border-b last:border-0">
                    <p className="font-medium text-sm line-through">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.dosage} · {m.frequency}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(m.startedAt).toLocaleDateString()} → {new Date(m.stoppedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Add another dog */}
      {dogs.length > 0 && (
        <button onClick={() => setShowAddDog(true)} className="w-full py-3 border-2 border-dashed rounded-xl text-gray-400 text-sm">
          + Add another dog
        </button>
      )}

      {showAddDog && <AddDogForm onClose={() => setShowAddDog(false)} onSaved={() => { setShowAddDog(false); refreshDogs(); }} />}
      {showAddMed && <AddMedForm dogId={selectedDog.dogId} onClose={() => setShowAddMed(false)} onSaved={() => { setShowAddMed(false); fetchDog(); }} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-700">{value}</p>
    </div>
  );
}

function AddDogForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const api = useApi();
  const [form, setForm] = useState({ name: '', breed: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/dogs', form); onSaved(); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Add a Dog</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <input placeholder="Breed" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Dog'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddMedForm({ dogId, onClose, onSaved }: { dogId: string; onClose: () => void; onSaved: () => void }) {
  const api = useApi();
  const [form, setForm] = useState({ name: '', dosage: '', frequency: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await api.post(`/dogs/${dogId}/medications`, form); onSaved(); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Add Medication</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input placeholder="Medication name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <input placeholder="Dosage (e.g., 100mg)" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <input placeholder="Frequency (e.g., twice daily)" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
            className="w-full px-3 py-3 border rounded-lg" required />
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Medication'}
          </button>
        </form>
      </div>
    </div>
  );
}
