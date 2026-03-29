import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchAuthSession, signIn, signUp, signOut, getCurrentUser, confirmSignUp } from 'aws-amplify/auth';

interface User {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  confirm: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const cognitoUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      setUser({
        userId: cognitoUser.userId,
        email: (payload?.email as string) || '',
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    await signIn({ username: email, password });
    await checkAuth();
  }

  async function register(email: string, password: string, name: string) {
    const result = await signUp({
      username: email,
      password,
      options: { userAttributes: { email, given_name: name } },
    });
    return { needsConfirmation: !result.isSignUpComplete };
  }

  async function confirm(email: string, code: string) {
    await confirmSignUp({ username: email, confirmationCode: code });
  }

  async function logout() {
    await signOut();
    setUser(null);
  }

  async function getToken(): Promise<string> {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || '';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, confirm, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
