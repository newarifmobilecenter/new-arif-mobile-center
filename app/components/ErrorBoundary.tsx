'use client';

import React, { ReactNode } from 'react';
import { trackError } from '../lib/errorTracking';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackError(
      'React Component Error',
      error.message,
      errorInfo.componentStack || undefined
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2>❌ Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 15px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
