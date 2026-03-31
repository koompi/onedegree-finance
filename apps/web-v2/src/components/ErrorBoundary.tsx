import React, { Component, ReactNode } from 'react'

interface State { hasError: boolean }
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl">😓</div>
        <div className="text-lg font-extrabold" style={{ color: 'var(--text)' }}>មានបញ្ហាកើតឡើង</div>
        <div className="text-sm text-center" style={{ color: 'var(--text-sec)' }}>សូមទំនាក់ទំនងក្រុមការងារ ឬសាកល្បងម្ដងទៀត</div>
        <button onClick={() => window.location.reload()} className="mt-2 px-7 py-3 rounded-xl text-sm font-extrabold border-none cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>ព្យាយាមម្ដងទៀត</button>
      </div>
    )
  }
}
