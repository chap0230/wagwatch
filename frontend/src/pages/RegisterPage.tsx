import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const { register, confirm, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(email, password, name);
      if (result.needsConfirmation) setStep('confirm');
      else { await login(email, password); navigate('/'); }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirm(email, code);
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🐾 Wag Watch</h1>
          <p className="text-blue-600 mt-2 text-sm font-medium">{step === 'register' ? 'Create your account' : 'Check your email'}</p>
        </div>
        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base" required />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base" required />
            <input type="password" placeholder="Password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base" required minLength={8} />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <p className="text-sm text-gray-600 text-center">Enter the verification code sent to {email}</p>
            <input type="text" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)}
              className="w-full px-3 py-3 border rounded-lg text-base text-center tracking-widest" required />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-blue-600">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
