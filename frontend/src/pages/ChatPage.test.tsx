import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../contexts/DogContext', () => ({
  useDog: () => ({ selectedDog: { dogId: 'dog-1', name: 'Bella' } }),
}));

const mockPost = vi.fn().mockResolvedValue({ sessionId: 's1', response: 'She had 3 accidents this week.' });
vi.mock('../lib/api', () => ({
  useApi: () => ({ post: mockPost, get: vi.fn() }),
}));

const { default: ChatPage } = await import('../pages/ChatPage');

describe('ChatPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders chat header with dog name', () => {
    render(<ChatPage />);
    expect(screen.getByText('Chat — Bella')).toBeInTheDocument();
  });

  it('renders suggested prompts when empty', () => {
    render(<ChatPage />);
    expect(screen.getByText('How was this week?')).toBeInTheDocument();
    expect(screen.getByText('Any patterns lately?')).toBeInTheDocument();
    expect(screen.getByText('Summarize the last month')).toBeInTheDocument();
  });

  it('renders input field and send button', () => {
    render(<ChatPage />);
    expect(screen.getByPlaceholderText('Ask about health data...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatPage />);
    expect(screen.getByText('Send')).toBeDisabled();
  });

  it('send button is enabled when input has text', () => {
    render(<ChatPage />);
    fireEvent.change(screen.getByPlaceholderText('Ask about health data...'), { target: { value: 'hello' } });
    expect(screen.getByText('Send')).not.toBeDisabled();
  });
});
