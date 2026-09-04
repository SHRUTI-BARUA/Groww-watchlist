import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 24px',
          margin: '24px auto',
          maxWidth: '640px',
          background: '#0B0F19',
          border: '1px solid #F43F5E',
          borderRadius: '12px',
          color: '#F9FAFB',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.7)'
        }}>
          <h2 style={{ fontSize: '18px', color: '#F43F5E', marginBottom: '8px' }}>
            Telemetry Interface Recovered
          </h2>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>
            A minor rendering error occurred in this view. The system has safely contained it.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              background: '#6366F1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
