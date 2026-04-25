import { useState, useEffect, useCallback } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import QuickLogModal from '../components/QuickLogModal';
import DailySummaryForm from '../components/DailySummaryForm';
import DayRatingPrompt from '../components/DayRatingPrompt';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';
import { todayInTz, localInputToISO, localDateInTz } from '../lib/timezone';

function todayStr() {
  return todayInTz();
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateInTz(d.toISOString());
}

function dismissKey(dogId: string, date: string) {
  return `wagwatch_rating_dismissed_${dogId}_${date}`;
}

function formatDateLabel(dateStr: string) {
  const today = todayInTz();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateInTz(yesterday.toISOString());

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
  const [showYesterdayPrompt, setShowYesterdayPrompt] = useState(false);

  // Check if yesterday has a day rating — show prompt if not and not already dismissed
  useEffect(() => {
    if (!selectedDog) return;
    const yesterday = yesterdayStr();
    const key = dismissKey(selectedDog.dogId, yesterday);
    if (localStorage.getItem(key)) return; // already dismissed today

    api.get(`/dogs/${selectedDog.dogId}/daily-summary/${yesterday}`)
      .then(data => {
        if (!data.dayRating) setShowYesterdayPrompt(true);
      })
      .catch(() => {});
  }, [selectedDog?.dogId]);

  const isToday = date === todayStr();

  const fetchDay = useCallback(async () => {
    if (!selectedDog) return;
    setLoading(true);
    try {
      // The backend groups by UTC date, which can differ from the user's local date.
      // Fetch both the local date AND the next UTC date to catch events logged near midnight.
      const nextDate = new Date(date + 'T12:00:00');
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().slice(0, 10);

      const [data, nextData] = await Promise.all([
        api.get(`/dogs/${selectedDog.dogId}/daily-summary/${date}`),
        api.get(`/dogs/${selectedDog.dogId}/daily-summary/${nextDateStr}`),
      ]);

      // Merge and deduplicate, then filter to only events whose local date matches
      const allEvents: any[] = [...(data.events || []), ...(nextData.events || [])];
      const seen = new Set<string>();
      const merged = allEvents.filter(e => {
        if (seen.has(e.eventId)) return false;
        seen.add(e.eventId);
        return localDateInTz(e.occurredAt) === date;
      });

      setEvents(merged);
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
    // Use occurredAt from the modal (user may have adjusted the time).
    // For past days without a modal-provided time, default to noon in user's timezone.
    const occurredAt = event.occurredAt ?? (isToday ? new Date().toISOString() : localInputToISO(`${date}T12:00`));
    const localDate = localDateInTz(occurredAt);
    await api.post(`/dogs/${selectedDog.dogId}/events`, { ...event, occurredAt, localDate });
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
      {/* Yesterday rating prompt */}
      {showYesterdayPrompt && selectedDog && (
        <DayRatingPrompt
          yesterday={yesterdayStr()}
          onDismiss={() => {
            localStorage.setItem(dismissKey(selectedDog.dogId, yesterdayStr()), '1');
            setShowYesterdayPrompt(false);
          }}
          onSaved={() => {
            localStorage.setItem(dismissKey(selectedDog.dogId, yesterdayStr()), '1');
            setShowYesterdayPrompt(false);
          }}
        />
      )}

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
