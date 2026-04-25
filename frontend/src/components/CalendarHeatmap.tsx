import { useState } from 'react';
import { todayInTz } from '../lib/timezone';

interface Props {
  dayRatings: Record<string, number>; // { "2026-03-26": 4 }
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}

// Rating 0 = no data, 1–5 = red to green
const RATING_BG: Record<number, string> = {
  0: 'bg-gray-100',
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-lime-400',
  5: 'bg-green-500',
};
const RATING_LABEL: Record<number, string> = {
  1: 'Bad', 2: 'Poor', 3: 'OK', 4: 'Good', 5: 'Great',
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CalendarHeatmap({ dayRatings, onDateClick, selectedDate }: Props) {
  const today = todayInTz();
  const [year, month] = today.split('-').map(Number);

  // Show up to 3 months: 2 months ago, last month, current month
  const months = [-2, -1, 0].map(offset => {
    let m = month - 1 + offset; // 0-indexed
    let y = year;
    if (m < 0) { m += 12; y -= 1; }
    if (m > 11) { m -= 12; y += 1; }
    return { year: y, month: m };
  });

  const [visibleMonth, setVisibleMonth] = useState(2); // index into months array, default = current

  const { year: vy, month: vm } = months[visibleMonth];
  const totalDays = daysInMonth(vy, vm);
  const startDay = firstDayOfMonth(vy, vm);
  const monthLabel = new Date(vy, vm, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Count rated days this month
  const ratedDays = Object.keys(dayRatings).filter(d => d.startsWith(`${vy}-${pad(vm + 1)}`)).length;

  return (
    <div className="bg-white rounded-xl p-3 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setVisibleMonth(v => Math.max(0, v - 1))}
          disabled={visibleMonth === 0}
          className="p-1 text-blue-600 disabled:text-gray-300 text-lg leading-none">‹</button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
          <p className="text-xs text-gray-400">{ratedDays > 0 ? `${ratedDays} day${ratedDays !== 1 ? 's' : ''} rated` : 'No ratings yet'}</p>
        </div>
        <button
          onClick={() => setVisibleMonth(v => Math.min(months.length - 1, v + 1))}
          disabled={visibleMonth === months.length - 1}
          className="p-1 text-blue-600 disabled:text-gray-300 text-lg leading-none">›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells before first day */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${vy}-${pad(vm + 1)}-${pad(day)}`;
          const rating = dayRatings[dateStr] || 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > today;

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onDateClick(dateStr)}
              disabled={isFuture}
              title={rating > 0 ? `${dateStr}: ${RATING_LABEL[rating]}` : dateStr}
              className={[
                'relative flex flex-col items-center justify-center rounded-lg py-1 text-xs font-medium transition-all',
                isFuture ? 'opacity-30 cursor-default' : 'active:scale-95',
                isSelected
                  ? 'ring-2 ring-blue-600 ring-offset-1'
                  : '',
                rating > 0 ? RATING_BG[rating] : 'bg-gray-100 hover:bg-gray-200',
                isToday && !isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : '',
              ].join(' ')}
            >
              <span className={rating > 0 ? 'text-white drop-shadow-sm' : 'text-gray-500'}>
                {day}
              </span>
              {isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs text-gray-400">Day rating:</span>
        {[1, 2, 3, 4, 5].map(r => (
          <div key={r} className="flex items-center gap-0.5">
            <span className={`w-3 h-3 rounded-sm ${RATING_BG[r]}`} />
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-0.5">Bad → Great</span>
      </div>

      {/* Month dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {months.map((_, i) => (
          <button
            key={i}
            onClick={() => setVisibleMonth(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === visibleMonth ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  );
}
