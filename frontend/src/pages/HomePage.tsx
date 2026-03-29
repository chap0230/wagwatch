import { useState, useEffect, useCallback } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import QuickLogModal from '../components/QuickLogModal';
import DailySummaryForm from '../components/DailySummaryForm';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string) {
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HomePage() {
  const { selectedDog, userMap } = useDog();
  const api = useApi();
  const [date, setDate] = useState(todayStr());
  const [events, setEvents] = useState<any[]>([]);
  const [dayRating, setDayRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const isToday = date === todayStr();

  const fetchDay = useCallback(async () => {
    if (!selectedDog) return;
    setLoading(true);
    try {
      const data = await api.get(`/dogs/${selectedDog.dogId}/daily-summary/${date}`);
      setEvents(data.events || []);
      setDayRating(data.dayRating);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedDog?.dogId, date]);

  useEffect(() => { fetchDay(); }, [fetchDay]);

  function goDay(offset: number) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().slice(0, 10);
    if (newDate <= todayStr()) setDate(newDate);
  }

  async function handleQuickLog(event: any) {
    if (!selectedDog) return;
    await api.post(`/dogs/${selectedDog.dogId}/events`, { ...event, occurredAt: isToday ? undefined : `${date}T12:00:00Z` });
    await fetchDay();
  }

  if (!selectedDog) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl">🐾</p>
        <p className="text-gray-500 mt-3">Add a dog from the Profile tab to get started</p>
      </div>
    );
  }

  const nonRatingEvents = events.filter(e => e.eventType !== 'DAY_RATING');

  return (
    <div>
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goDay(-1)} className="p-2 text-lg text-blue-600">‹</button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{formatDateLabel(date)} — {selectedDog.name}</h2>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <button onClick={() => goDay(1)} disabled={isToday}
          className={`p-2 text-lg ${isToday ? 'text-gray-300' : 'text-blue-600'}`}>›</button>
      </div>

      {/* Day rating + actions */}
      <div className="flex items-center justify-between mb-4">
        {dayRating ? (
          <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
            {'★'.repeat(dayRating)}{'☆'.repeat(5 - dayRating)}
          </span>
        ) : <span />}
        <button onClick={() => setShowDailySummary(true)} className="text-sm text-blue-600">Log full day</button>
      </div>

      {loading && !events.length ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : nonRatingEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p>No events logged {isToday ? 'today' : 'this day'}</p>
          <p className="text-sm mt-1">Tap + to log an event</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nonRatingEvents
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
            .map(event => <EventCard key={event.eventId} event={event} onClick={() => setSelectedEvent(event)} />)}
        </div>
      )}

      <QuickLogModal onSubmit={handleQuickLog} />
      {showDailySummary && <DailySummaryForm date={date} onClose={() => setShowDailySummary(false)} onSaved={fetchDay} />}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdated={fetchDay} userMap={userMap} />}
    </div>
  );
}
