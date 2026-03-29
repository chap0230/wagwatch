import { DAY_RATING_EMOJIS, NIGHT_RATING_EMOJIS } from '../lib/constants';

const ICONS: Record<string, string> = {
  ACCIDENT: '🚽', MEDICAL: '🏥', BEHAVIOR: '🐕', NIGHT_NOTE: '🌙', DAY_RATING: '⭐',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function eventSummary(event: any): string {
  const d = event.data;
  switch (event.eventType) {
    case 'ACCIDENT': return `${d.type === 'pee' ? '💧 Pee' : '💩 Poop'} — ${d.location}`;
    case 'MEDICAL': return `${d.medicalType}${d.severity ? ` (${d.severity})` : ''}`;
    case 'BEHAVIOR': return d.behaviorType;
    case 'NIGHT_NOTE': {
      const emoji = d.rating ? NIGHT_RATING_EMOJIS[d.rating] || '' : '';
      return d.rating ? `${emoji} ${d.rating}/5` : d.description;
    }
    case 'DAY_RATING': return `${DAY_RATING_EMOJIS[d.rating] || ''} ${d.rating}/5`;
    default: return '';
  }
}

export default function EventCard({ event, onClick }: { event: any; onClick?: () => void }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${onClick ? 'cursor-pointer active:bg-gray-50' : ''}`} onClick={onClick}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{ICONS[event.eventType] || '📝'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{eventSummary(event)}</span>
            <span className="text-xs text-gray-400 ml-2 shrink-0">{formatTime(event.occurredAt)}</span>
          </div>
          {event.notes && <p className="text-sm text-gray-500 mt-1 truncate">{event.notes}</p>}
          {event.eventType === 'NIGHT_NOTE' && event.data?.description && event.data?.rating && (
            <p className="text-sm text-gray-500 mt-1 truncate">{event.data.description}</p>
          )}
        </div>
        {onClick && <span className="text-gray-300 text-sm mt-1">›</span>}
      </div>
    </div>
  );
}
