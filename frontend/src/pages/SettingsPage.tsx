import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getUserTimezone, setUserTimezone, TIMEZONE_OPTIONS } from '../lib/timezone';

export default function SettingsPage() {
  const api = useApi();
  const { user, logout } = useAuth();
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState(getUserTimezone());

  useEffect(() => { fetchHousehold(); }, []);

  async function fetchHousehold() {
    try {
      const dogs = await api.get('/dogs');
      if (dogs.length > 0) {
        const householdId = dogs[0].householdId;
        const hh = await api.get(`/households/${householdId}`);
        setHousehold(hh);
        setInviteCode(hh.inviteCode || '');
        // Fetch members
        if (hh.members) {
          setMembers(hh.members);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function regenerateInvite() {
    if (!household) return;
    try {
      const result = await api.post(`/households/${household.householdId}/invite`, {});
      setInviteCode(result.inviteCode);
      setCopied(false);
    } catch { /* ignore */ }
  }

  async function removeMember(memberId: string) {
    if (!household || !confirm('Remove this member from the household?')) return;
    try {
      await api.post(`/households/${household.householdId}/remove-member`, { userId: memberId });
      setMembers(members.filter(m => m.userId !== memberId));
    } catch { /* ignore */ }
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Household */}
      <section className="bg-white rounded-xl p-4 border">
        <h3 className="font-semibold mb-3">🏠 Household</h3>
        {household ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-gray-700">{household.name}</p>
            </div>

            {/* Members */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Members</p>
              {members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((m: any) => (
                    <div key={m.userId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{m.displayName || m.email}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                      {m.userId !== user?.userId && (
                        <button onClick={() => removeMember(m.userId)}
                          className="text-red-400 hover:text-red-600 text-lg px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Just you for now</p>
              )}
            </div>

            {/* Invite Code */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Invite Code</p>
              <p className="text-sm text-gray-500 mb-2">Share this code so others can join your household</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border rounded-lg px-4 py-3 text-center font-mono text-lg tracking-widest">
                  {inviteCode}
                </div>
                <button onClick={copyCode}
                  className="px-3 py-3 bg-blue-600 text-white rounded-lg text-sm shrink-0">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={regenerateInvite} className="text-sm text-gray-500 mt-2">
                Generate new code
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No household found</p>
        )}
      </section>

      {/* Account */}
      <section className="bg-white rounded-xl p-4 border">
        <h3 className="font-semibold mb-3">👤 Account</h3>
        <div>
          <p className="text-xs text-gray-400">Email</p>
          <p className="text-gray-700">{user?.email}</p>
        </div>
      </section>

      {/* Timezone */}
      <section className="bg-white rounded-xl p-4 border">
        <h3 className="font-semibold mb-3">🕐 Time Zone</h3>
        <p className="text-xs text-gray-400 mb-2">Used for displaying and logging event times</p>
        <select
          value={timezone}
          onChange={e => { setTimezone(e.target.value); setUserTimezone(e.target.value); }}
          className="w-full px-3 py-2 border rounded-lg text-sm">
          {TIMEZONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </section>

      <button onClick={logout} className="w-full py-3 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium">
        Sign Out
      </button>

      <p className="text-center text-xs text-gray-400 pb-2">
        🐾 Wag Watch — Keep a close, caring eye on the health trends that keep your dog's tail wagging.
      </p>
    </div>
  );
}
