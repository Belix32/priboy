import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 24,
          textAlign: 'center',
          background: 'var(--ocean-deep, #0c4a6e)',
          color: 'white',
        }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Что-то пошло не так</h1>
          <p style={{ marginBottom: 24, color: 'rgba(255,255,255,0.7)' }}>
            {this.state.error?.message || 'Произошла непредвиденная ошибка'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              background: 'white',
              color: '#0369a1',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Обновить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
