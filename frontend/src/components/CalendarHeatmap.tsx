import { ActivityCalendar, type Activity } from 'react-activity-calendar';

interface Props {
  dayRatings: Record<string, number>; // { "2026-03-26": 4 }
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}

const RATING_COLORS = ['#f3f4f6', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
// index 0 = no data (gray), 1-5 = rating colors (red to green)

export default function CalendarHeatmap({ dayRatings }: Props) {
  // Build last 90 days of activity data
  const activities: Activity[] = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rating = dayRatings[dateStr];
    activities.push({ date: dateStr, count: rating || 0, level: (rating || 0) as 0 | 1 | 2 | 3 | 4 });
  }

  return (
    <div className="bg-white rounded-xl p-3 border overflow-x-auto">
      <p className="text-xs text-gray-500 mb-2">Day ratings (tap a date to filter)</p>
      <ActivityCalendar
        data={activities}
        maxLevel={4}
        blockSize={12}
        blockMargin={3}
        fontSize={11}
        theme={{ dark: RATING_COLORS.slice(1), light: RATING_COLORS.slice(1) }}
        labels={{ totalCount: '{{count}} days rated' }}
      />
      <div className="flex gap-2 mt-2 text-xs text-gray-400 justify-end items-center">
        <span>Bad</span>
        {RATING_COLORS.slice(1).map((c, i) => (
          <span key={i} className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: c }} />
        ))}
        <span>Great</span>
      </div>
    </div>
  );
}
