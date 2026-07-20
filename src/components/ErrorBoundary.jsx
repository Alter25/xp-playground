import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 12, padding: 24,
          color: 'var(--red, #f87171)', fontFamily: 'monospace', fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>✕ Editor crashed</span>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: 500, opacity: 0.8 }}>
            {this.state.error.message}
          </pre>
          <button
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid currentColor',
              background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 13,
            }}
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
