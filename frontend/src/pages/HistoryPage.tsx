import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import EventCard from '../components/EventCard';
import CalendarHeatmap from '../components/CalendarHeatmap';
import ExportBar from '../components/ExportBar';
import EventDetailModal from '../components/EventDetailModal';
import { todayInTz, localDateInTz } from '../lib/timezone';

type EventType = 'ACCIDENT' | 'MEDICAL' | 'BEHAVIOR' | 'NIGHT_NOTE' | 'DAY_RATING' | 'MEAL' | '';

export default function HistoryPage() {
  const { selectedDog, userMap } = useDog();
  const api = useApi();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<EventType>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = todayInTz();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const start = localDateInTz(startDate.toISOString());
    return { start, end };
  });

  const fetchEvents = useCallback(async () => {
    if (!selectedDog) return;
    setLoading(true);
    try {
      // Widen the date range by 1 day on each side to catch events near midnight
      // whose UTC date differs from the local date. Client-side filtering handles display.
      const startPadded = new Date(dateRange.start + 'T12:00:00');
      startPadded.setDate(startPadded.getDate() - 1);
      const endPadded = new Date(dateRange.end + 'T12:00:00');
      endPadded.setDate(endPadded.getDate() + 1);

      const params = new URLSearchParams({
        startDate: startPadded.toISOString().slice(0, 10),
        endDate: endPadded.toISOString().slice(0, 10),
      });
      if (filterType) params.set('eventType', filterType);
      const data = await api.get(`/dogs/${selectedDog.dogId}/events?${params}`);
      setEvents(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedDog?.dogId, dateRange.start, dateRange.end, filterType]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (!selectedDog) return <p className="text-gray-500 text-center py-8">Select a dog first</p>;

  // Build day ratings map for heatmap — key by local date derived from occurredAt
  const dayRatings: Record<string, number> = {};
  events.filter(e => e.eventType === 'DAY_RATING').forEach(e => {
    const localDate = localDateInTz(e.occurredAt);
    dayRatings[localDate] = e.data.rating;
  });

  // Filter events for display — use occurredAt local date instead of stored date field
  let displayEvents = events.filter(e => {
    if (e.eventType === 'DAY_RATING') return false;
    const localDate = localDateInTz(e.occurredAt);
    return localDate >= dateRange.start && localDate <= dateRange.end;
  });
  if (selectedDate) displayEvents = displayEvents.filter(e => localDateInTz(e.occurredAt) === selectedDate);
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    displayEvents = displayEvents.filter(e =>
      JSON.stringify(e.data).toLowerCase().includes(term) ||
      (e.notes || '').toLowerCase().includes(term)
    );
  }
  displayEvents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">History — {selectedDog.name}</h2>
        <Link to="/trends" className="text-sm text-blue-600">📊 Trends</Link>
      </div>

      <ExportBar events={events} startDate={dateRange.start} endDate={dateRange.end} />

      <CalendarHeatmap dayRatings={dayRatings} onDateClick={date => setSelectedDate(selectedDate === date ? null : date)} selectedDate={selectedDate} />

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value as EventType)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm">
          <option value="">All types</option>
          <option value="ACCIDENT">🚽 Accidents</option>
          <option value="MEAL">🍽️ Meals</option>
          <option value="MEDICAL">🏥 Medical</option>
          <option value="BEHAVIOR">🐕 Behavior</option>
          <option value="NIGHT_NOTE">🌙 Night Notes</option>
        </select>
        <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm" />
      </div>

      {selectedDate && (
        <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
          <span className="text-sm text-blue-700">
            Showing: {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={() => setSelectedDate(null)} className="text-blue-600 text-sm">Clear</button>
        </div>
      )}

      {/* Date range */}
      <div className="flex gap-2 items-center text-sm">
        <input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
          className="border rounded-lg px-2 py-1" />
        <span className="text-gray-400">to</span>
        <input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
          className="border rounded-lg px-2 py-1" />
      </div>

      {/* Event list */}
      {loading ? (
        <p className="text-gray-400 text-center py-4">Loading...</p>
      ) : displayEvents.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No events found</p>
      ) : (
        <div className="space-y-3">
          {displayEvents.map(event => <EventCard key={event.eventId} event={event} onClick={() => setSelectedEvent(event)} />)}
        </div>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdated={fetchEvents} userMap={userMap} />}
    </div>
  );
}
