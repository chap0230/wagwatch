interface Event {
  eventType: string;
  date: string;
  occurredAt: string;
  data: any;
}

export interface WeeklyAccidents {
  week: string;
  pee: number;
  poop: number;
}

export interface WeeklyMedical {
  week: string;
  [type: string]: number | string;
}

export interface DailyRating {
  date: string;
  rating: number;
}

export interface WeeklyBehavior {
  week: string;
  count: number;
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(5, 10); // "MM-DD"
}

export function aggregateAccidentsByWeek(events: Event[]): WeeklyAccidents[] {
  const map: Record<string, { pee: number; poop: number }> = {};
  events.filter(e => e.eventType === 'ACCIDENT').forEach(e => {
    const week = getWeekLabel(e.date);
    if (!map[week]) map[week] = { pee: 0, poop: 0 };
    map[week][e.data.type as 'pee' | 'poop']++;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([week, d]) => ({ week, ...d }));
}

export function aggregateMedicalByWeek(events: Event[]): WeeklyMedical[] {
  const map: Record<string, Record<string, number>> = {};
  events.filter(e => e.eventType === 'MEDICAL').forEach(e => {
    const week = getWeekLabel(e.date);
    const type = e.data.medicalType || 'Other';
    if (!map[week]) map[week] = {};
    map[week][type] = (map[week][type] || 0) + 1;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([week, types]) => ({ week, ...types }));
}

export function extractDailyRatings(events: Event[]): DailyRating[] {
  const map: Record<string, number> = {};
  events.filter(e => e.eventType === 'DAY_RATING').forEach(e => { map[e.date] = e.data.rating; });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, rating]) => ({ date: date.slice(5), rating }));
}

export function aggregateBehaviorByWeek(events: Event[]): WeeklyBehavior[] {
  const map: Record<string, number> = {};
  events.filter(e => e.eventType === 'BEHAVIOR').forEach(e => {
    const week = getWeekLabel(e.date);
    map[week] = (map[week] || 0) + 1;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count }));
}
