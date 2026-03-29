import { render, screen } from '@testing-library/react';
import EventCard from '../components/EventCard';
import { describe, it, expect } from 'vitest';

describe('EventCard', () => {
  it('renders accident event', () => {
    render(<EventCard event={{
      eventType: 'ACCIDENT', occurredAt: '2026-03-26T10:00:00Z',
      data: { type: 'pee', location: 'Inside' }, notes: 'near couch',
    }} />);
    expect(screen.getByText(/Pee/)).toBeInTheDocument();
    expect(screen.getByText(/Inside/)).toBeInTheDocument();
    expect(screen.getByText('near couch')).toBeInTheDocument();
  });

  it('renders medical event with severity', () => {
    render(<EventCard event={{
      eventType: 'MEDICAL', occurredAt: '2026-03-26T11:00:00Z',
      data: { medicalType: 'Vomiting', severity: 'moderate' },
    }} />);
    expect(screen.getByText(/Vomiting/)).toBeInTheDocument();
    expect(screen.getByText(/moderate/)).toBeInTheDocument();
  });

  it('renders day rating with emoji', () => {
    render(<EventCard event={{
      eventType: 'DAY_RATING', occurredAt: '2026-03-26T20:00:00Z',
      data: { rating: 4 },
    }} />);
    expect(screen.getByText(/🙂/)).toBeInTheDocument();
    expect(screen.getByText(/4\/5/)).toBeInTheDocument();
  });

  it('renders night rating with emoji', () => {
    render(<EventCard event={{
      eventType: 'NIGHT_NOTE', occurredAt: '2026-03-26T06:00:00Z',
      data: { rating: 2, description: 'restless' },
    }} />);
    expect(screen.getByText(/😟/)).toBeInTheDocument();
  });

  it('renders behavior event', () => {
    render(<EventCard event={{
      eventType: 'BEHAVIOR', occurredAt: '2026-03-26T14:00:00Z',
      data: { behaviorType: 'Excessive licking' },
    }} />);
    expect(screen.getByText('Excessive licking')).toBeInTheDocument();
  });
});
