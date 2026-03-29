import { useState, useEffect, useCallback } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { aggregateAccidentsByWeek, aggregateMedicalByWeek, extractDailyRatings, aggregateBehaviorByWeek } from '../lib/chart-utils';

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function TrendsPage() {
  const { selectedDog } = useDog();
  const api = useApi();
  const [events, setEvents] = useState<any[]>([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!selectedDog) return;
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeDays);
    try {
      const data = await api.get(`/dogs/${selectedDog.dogId}/events?startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`);
      setEvents(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedDog?.dogId, rangeDays]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (!selectedDog) return <p className="text-gray-500 text-center py-8">Select a dog first</p>;

  const accidentData = aggregateAccidentsByWeek(events);
  const medicalData = aggregateMedicalByWeek(events);
  const ratingData = extractDailyRatings(events);
  const behaviorData = aggregateBehaviorByWeek(events);

  // Get unique medical types for dynamic bars
  const medicalTypes = [...new Set(events.filter(e => e.eventType === 'MEDICAL').map(e => e.data.medicalType))];
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends — {selectedDog.name}</h2>
      </div>

      {/* Range selector */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button key={r.days} onClick={() => setRangeDays(r.days)}
            className={`px-3 py-1 rounded-lg text-sm border ${rangeDays === r.days ? 'bg-blue-600 text-white border-blue-600' : ''}`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> : (
        <>
          {/* Day Ratings */}
          <ChartCard title="⭐ Day Ratings">
            {ratingData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ratingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Accidents */}
          <ChartCard title="🚽 Accidents per Week">
            {accidentData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={accidentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pee" stackId="a" fill="#60a5fa" name="💧 Pee" />
                  <Bar dataKey="poop" stackId="a" fill="#a78bfa" name="💩 Poop" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Medical Events */}
          <ChartCard title="🏥 Medical Events per Week">
            {medicalData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={medicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {medicalTypes.map((type, i) => (
                    <Bar key={type} dataKey={type} fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Behavioral Changes */}
          <ChartCard title="🐕 Behavioral Changes per Week">
            {behaviorData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={behaviorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" name="Changes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-gray-400 text-sm text-center py-6">No data for this period</p>;
}
