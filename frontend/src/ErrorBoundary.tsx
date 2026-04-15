import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MineGIS ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0F172A', color: '#F1F5F9',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: '#1E293B', border: '1px solid #EF4444', borderRadius: '12px',
            padding: '2rem', maxWidth: '600px', width: '100%'
          }}>
            <h2 style={{ color: '#EF4444', margin: '0 0 1rem', fontSize: '1.25rem' }}>
              ⚠️ Application Error
            </h2>
            <p style={{ color: '#94A3B8', marginBottom: '1rem', fontSize: '0.875rem' }}>
              MineGIS-TS encountered an unexpected error. Please refresh the page or
              clear your browser cache.
            </p>
            <pre style={{
              background: '#0F172A', color: '#FCA5A5', padding: '1rem',
              borderRadius: '8px', fontSize: '0.75rem', overflow: 'auto',
              maxHeight: '200px', border: '1px solid #334155'
            }}>
              {this.state.error.toString()}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/login' }}
              style={{
                marginTop: '1.5rem', background: '#1A3C6E', color: 'white',
                border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600
              }}
            >
              Return to Login
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
