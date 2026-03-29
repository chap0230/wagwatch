import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { describe, it, expect } from 'vitest';

describe('BottomNav', () => {
  it('renders all navigation tabs', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Dog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders correct links', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[4]).toHaveAttribute('href', '/settings');
  });
});
