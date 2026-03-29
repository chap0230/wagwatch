import { useState } from 'react';
import { useApi } from '../lib/api';

interface Props {
  onComplete: () => void;
}

export default function SetupFlow({ onComplete }: Props) {
  const api = useApi();
  const [step, setStep] = useState<'household' | 'dog'>('household');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [dogForm, setDogForm] = useState({ name: '', breed: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/households', { name: householdName });
      setStep('dog');
    } catch (err: any) { setError(err.message || 'Failed to create household'); }
    finally { setLoading(false); }
  }

  async function handleJoinHousehold(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/households/join', { inviteCode });
      setStep('dog');
    } catch (err: any) { setError(err.message || 'Invalid invite code'); }
    finally { setLoading(false); }
  }

  async function handleAddDog(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/dogs', dogForm);
      onComplete();
    } catch (err: any) { setError(err.message || 'Failed to add dog'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-4xl mb-2">🐾</p>
          <h2 className="text-xl font-bold">
            {step === 'household' ? 'Welcome! Let\'s get set up' : 'Add your dog'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'household' ? 'Step 1 of 2 — Create or join a household' : 'Step 2 of 2 — Tell us about your pup'}
          </p>
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        {step === 'household' && !mode && (
          <div className="space-y-3">
            <button onClick={() => setMode('create')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium">
              Create a Household
            </button>
            <button onClick={() => setMode('join')}
              className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium">
              Join with Invite Code
            </button>
          </div>
        )}

        {step === 'household' && mode === 'create' && (
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <input placeholder="Household name (e.g., Smith Family)" value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base" required />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-sm text-gray-500">Back</button>
          </form>
        )}

        {step === 'household' && mode === 'join' && (
          <form onSubmit={handleJoinHousehold} className="space-y-4">
            <input placeholder="Invite code" value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base text-center tracking-widest uppercase" required />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-sm text-gray-500">Back</button>
          </form>
        )}

        {step === 'dog' && (
          <form onSubmit={handleAddDog} className="space-y-4">
            <input placeholder="Dog's name" value={dogForm.name}
              onChange={e => setDogForm({ ...dogForm, name: e.target.value })}
              className="w-full px-3 py-3 border rounded-lg text-base" required />
            <input placeholder="Breed" value={dogForm.breed}
              onChange={e => setDogForm({ ...dogForm, breed: e.target.value })}
              className="w-full px-3 py-3 border rounded-lg text-base" required />
            <div>
              <label className="text-sm text-gray-500">Date of birth</label>
              <input type="date" value={dogForm.dateOfBirth}
                onChange={e => setDogForm({ ...dogForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-3 border rounded-lg text-base" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Dog'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
