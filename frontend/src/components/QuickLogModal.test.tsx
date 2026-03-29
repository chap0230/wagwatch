import { render, screen, fireEvent } from '@testing-library/react';
import QuickLogModal from '../components/QuickLogModal';
import { describe, it, expect, vi } from 'vitest';

describe('QuickLogModal', () => {
  it('renders FAB button when closed', () => {
    render(<QuickLogModal onSubmit={vi.fn()} />);
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('opens modal and shows event type options', () => {
    render(<QuickLogModal onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('+'));
    expect(screen.getByText('Log an event')).toBeInTheDocument();
    expect(screen.getByText('Potty')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
    expect(screen.getByText('Night Rating')).toBeInTheDocument();
    expect(screen.getByText('Day Rating')).toBeInTheDocument();
  });

  it('shows potty form with Inside/Outside when Potty is selected', () => {
    render(<QuickLogModal onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('Potty'));
    expect(screen.getByText(/Inside/)).toBeInTheDocument();
    expect(screen.getByText(/Outside/)).toBeInTheDocument();
  });

  it('shows day rating form with emojis', () => {
    render(<QuickLogModal onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('Day Rating'));
    expect(screen.getByText('😢')).toBeInTheDocument();
    expect(screen.getByText('😄')).toBeInTheDocument();
  });

  it('shows back button in form step', () => {
    render(<QuickLogModal onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('Medical'));
    expect(screen.getByText('← Back')).toBeInTheDocument();
  });
});
