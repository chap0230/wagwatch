import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error) { console.error('ErrorBoundary caught:', error); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-3xl mb-3">😵</p>
          <p className="text-gray-700 font-medium">Something went wrong</p>
          <button onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
