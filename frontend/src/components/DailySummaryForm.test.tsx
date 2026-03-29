import { render, screen, fireEvent } from '@testing-library/react';
import DailySummaryForm from '../components/DailySummaryForm';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../contexts/DogContext', () => ({
  useDog: () => ({ selectedDog: { dogId: 'dog-1', name: 'Bella' } }),
}));
vi.mock('../lib/api', () => ({
  useApi: () => ({ post: vi.fn().mockResolvedValue({}), get: vi.fn() }),
}));

describe('DailySummaryForm', () => {
  it('renders all sections', () => {
    render(<DailySummaryForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Day Rating')).toBeInTheDocument();
    expect(screen.getByText(/Potty/)).toBeInTheDocument();
    expect(screen.getByText(/Medical Events/)).toBeInTheDocument();
    expect(screen.getByText(/Behavioral Changes/)).toBeInTheDocument();
    expect(screen.getByText(/Night Rating/)).toBeInTheDocument();
  });

  it('renders rating emojis', () => {
    render(<DailySummaryForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getAllByText('😢').length).toBeGreaterThan(0);
    expect(screen.getAllByText('😄').length).toBeGreaterThan(0);
  });

  it('can add a potty entry', () => {
    render(<DailySummaryForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const addButtons = screen.getAllByText('+ Add');
    fireEvent.click(addButtons[0]);
    expect(screen.getByText(/Inside/)).toBeInTheDocument();
    expect(screen.getByText(/Outside/)).toBeInTheDocument();
  });

  it('renders behavior chips', () => {
    render(<DailySummaryForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Excessive licking')).toBeInTheDocument();
    expect(screen.getByText('Pacing')).toBeInTheDocument();
  });
});
