import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, getToken: () => Promise<string>, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
  return data;
}

export function useApi() {
  const { getToken } = useAuth();
  return {
    get: (path: string) => apiFetch(path, getToken),
    post: (path: string, body: any) => apiFetch(path, getToken, { method: 'POST', body: JSON.stringify(body) }),
    put: (path: string, body: any) => apiFetch(path, getToken, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path: string) => apiFetch(path, getToken, { method: 'DELETE' }),
  };
}
