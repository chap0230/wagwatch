import { useDog } from '../contexts/DogContext';

export default function TopBar() {
  const { dogs, selectedDog, selectDog } = useDog();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b flex items-center justify-between px-4 py-3 z-50">
      <h1 className="text-lg font-bold">🐾 Wag Watch</h1>
      {dogs.length > 0 && (
        <select value={selectedDog?.dogId || ''} onChange={e => selectDog(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm max-w-[160px]">
          {dogs.map(d => <option key={d.dogId} value={d.dogId}>{d.name}</option>)}
        </select>
      )}
    </header>
  );
}
