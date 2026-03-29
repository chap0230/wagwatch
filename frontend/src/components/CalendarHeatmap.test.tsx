import { render, screen } from '@testing-library/react';
import CalendarHeatmap from '../components/CalendarHeatmap';
import { describe, it, expect, vi } from 'vitest';

// Mock react-activity-calendar since it doesn't render well in jsdom
vi.mock('react-activity-calendar', () => ({
  ActivityCalendar: () => <div data-testid="activity-calendar" />,
}));

describe('CalendarHeatmap', () => {
  it('renders with day ratings label', () => {
    render(<CalendarHeatmap dayRatings={{}} onDateClick={vi.fn()} selectedDate={null} />);
    expect(screen.getByText(/Day ratings/)).toBeInTheDocument();
  });

  it('renders legend with Bad and Great labels', () => {
    render(<CalendarHeatmap dayRatings={{}} onDateClick={vi.fn()} selectedDate={null} />);
    expect(screen.getByText('Bad')).toBeInTheDocument();
    expect(screen.getByText('Great')).toBeInTheDocument();
  });

  it('renders the calendar component', () => {
    render(<CalendarHeatmap dayRatings={{}} onDateClick={vi.fn()} selectedDate={null} />);
    expect(screen.getByTestId('activity-calendar')).toBeInTheDocument();
  });
});
