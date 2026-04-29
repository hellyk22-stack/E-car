import React from 'react'

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('App crashed during render', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
                    <div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">Runtime Error</p>
                        <h1 className="mt-3 text-3xl font-black">The app crashed while rendering.</h1>
                        <p className="mt-4 text-sm text-white/75" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Refresh once after saving. If this message stays, share the error text below and we can fix the exact component quickly.
                        </p>
                        <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950/80 p-4 text-sm text-rose-100">
                            {this.state.error?.stack || this.state.error?.message || 'Unknown render error'}
                        </pre>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default AppErrorBoundary
