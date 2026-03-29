import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useApi } from '../lib/api';
import { useAuth } from './AuthContext';
import SetupFlow from '../components/SetupFlow';

interface Dog {
  dogId: string;
  name: string;
  breed: string;
  photoUrl?: string;
}

interface DogContextType {
  dogs: Dog[];
  selectedDog: Dog | null;
  selectDog: (dogId: string) => void;
  refreshDogs: () => Promise<void>;
  userMap: Record<string, string>;
}

const DogContext = createContext<DogContextType | null>(null);

export function DogProvider({ children }: { children: ReactNode }) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const api = useApi();
  const { user } = useAuth();

  useEffect(() => {
    if (user) refreshDogs();
  }, [user]);

  async function refreshDogs() {
    try {
      const data = await api.get('/dogs');
      setDogs(data);
      if (data.length && !selectedDogId) setSelectedDogId(data[0].dogId);
      // Fetch household members for user map
      if (data.length && data[0].householdId) {
        try {
          const hh = await api.get(`/households/${data[0].householdId}`);
          const map: Record<string, string> = {};
          (hh.members || []).forEach((m: any) => { map[m.userId] = m.displayName || m.email; });
          setUserMap(map);
        } catch { /* ignore */ }
      }
    } catch { /* user may not have household yet */ }
    finally { setLoaded(true); }
  }

  const selectedDog = dogs.find(d => d.dogId === selectedDogId) || null;

  // Show setup flow if user has no dogs after initial load
  if (loaded && dogs.length === 0) {
    return (
      <DogContext.Provider value={{ dogs, selectedDog, selectDog: setSelectedDogId, refreshDogs, userMap }}>
        <SetupFlow onComplete={refreshDogs} />
      </DogContext.Provider>
    );
  }

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <DogContext.Provider value={{ dogs, selectedDog, selectDog: setSelectedDogId, refreshDogs, userMap }}>
      {children}
    </DogContext.Provider>
  );
}

export function useDog() {
  const ctx = useContext(DogContext);
  if (!ctx) throw new Error('useDog must be used within DogProvider');
  return ctx;
}
