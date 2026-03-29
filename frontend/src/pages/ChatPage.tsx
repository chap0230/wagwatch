import { useState, useRef, useEffect } from 'react';
import { useDog } from '../contexts/DogContext';
import { useApi } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_PROMPTS = [
  'How was this week?',
  'Any patterns lately?',
  'Summarize the last month',
  'Compare to last week',
  'How many accidents this week?',
];

export default function ChatPage() {
  const { selectedDog } = useDog();
  const api = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.(0, scrollRef.current.scrollHeight);
  }, [messages, loading]);

  // Reset chat when dog changes
  useEffect(() => { setMessages([]); setSessionId(null); }, [selectedDog?.dogId]);

  async function sendMessage(text: string) {
    if (!selectedDog || !text.trim()) return;
    setError('');
    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const body: any = { message: text.trim() };
      if (sessionId) body.sessionId = sessionId;

      const data = await api.post(`/dogs/${selectedDog.dogId}/chat`, body);
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
      setMessages(prev => prev.slice(0, -1)); // remove the user message on error
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function startNewChat() {
    setMessages([]);
    setSessionId(null);
    setError('');
  }

  if (!selectedDog) return <p className="text-gray-500 text-center py-8">Select a dog first</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Chat — {selectedDog.name}</h2>
        {messages.length > 0 && (
          <button onClick={startNewChat} className="text-sm text-blue-600">New Chat</button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">💬</p>
            <p className="text-gray-500 mb-4">Ask me anything about {selectedDog.name}'s health</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button key={prompt} onClick={() => sendMessage(prompt)}
                  className="px-3 py-2 bg-white border rounded-full text-sm text-gray-700 active:bg-gray-50">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border rounded-bl-md text-gray-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-red-600">
              {error}
              <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about health data..."
          disabled={loading} className="flex-1 px-4 py-3 border rounded-full text-sm disabled:opacity-50" />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-4 py-3 bg-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
