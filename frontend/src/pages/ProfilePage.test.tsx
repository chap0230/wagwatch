import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../contexts/DogContext', () => ({
  useDog: () => ({
    selectedDog: { dogId: 'dog-1', name: 'Bella' },
    dogs: [{ dogId: 'dog-1', name: 'Bella' }],
    refreshDogs: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  useApi: () => ({
    get: vi.fn().mockImplementation((path: string) => {
      if (path.includes('/medications')) return Promise.resolve([
        { medicationId: 'm1', name: 'Gabapentin', dosage: '100mg', frequency: 'twice daily', status: 'ACTIVE', startedAt: '2026-01-01T00:00:00Z' },
        { medicationId: 'm2', name: 'Rimadyl', dosage: '50mg', frequency: 'daily', status: 'STOPPED', startedAt: '2025-06-01T00:00:00Z', stoppedAt: '2025-12-01T00:00:00Z' },
      ]);
      return Promise.resolve({
        dogId: 'dog-1', name: 'Bella', breed: 'Lab Mix', dateOfBirth: '2009-03-15',
        weight: 45, vetName: 'Dr. Smith', conditions: ['Arthritis'], allergies: [],
      });
    }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
  }),
}));

// Dynamic import to ensure mocks are set up first
const { default: ProfilePage } = await import('../pages/ProfilePage');

describe('ProfilePage', () => {
  it('renders dog name and breed', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('Bella')).toBeInTheDocument();
    expect(await screen.findByText(/Lab Mix/)).toBeInTheDocument();
  });

  it('renders active medications', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('Gabapentin')).toBeInTheDocument();
    expect(await screen.findByText(/100mg/)).toBeInTheDocument();
  });

  it('renders stopped medications toggle', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText(/Stopped \(1\)/)).toBeInTheDocument();
  });

  it('renders add medication button', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('+ Add')).toBeInTheDocument();
  });

  it('renders edit button', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('Edit')).toBeInTheDocument();
  });
});
