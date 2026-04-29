import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const FloatingAIAdvisor = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const hiddenRoutes = ['/user/pricing', '/user/subscription']
    const shouldHide = hiddenRoutes.some((route) => location.pathname.startsWith(route))
    const isActive = location.pathname.startsWith('/user/ai')

    if (shouldHide) return null

    return (
        <button
            type="button"
            onClick={() => navigate('/user/ai')}
            className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full px-3.5 py-3 text-left text-white transition-all duration-300 hover:-translate-y-1 sm:bottom-6 sm:right-6 sm:px-4"
            style={{
                background: isActive
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.45))'
                    : 'linear-gradient(135deg, rgba(12,18,32,0.82), rgba(59,47,110,0.38))',
                border: isActive ? '1px solid rgba(129,140,248,0.48)' : '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 18px 40px rgba(6,10,24,0.38), inset 0 1px 0 rgba(255,255,255,0.16)',
                fontFamily: "'DM Sans', sans-serif",
            }}
            aria-label="Open AI Advisor"
            title="Open AI Advisor"
        >
            <span
                className="pointer-events-none absolute inset-0 rounded-full opacity-80"
                style={{
                    background: 'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at 82% 78%, rgba(99,102,241,0.24), transparent 38%)',
                }}
            />
            <span
                className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95))',
                    boxShadow: '0 10px 22px rgba(99,102,241,0.34), inset 0 1px 0 rgba(255,255,255,0.24)',
                }}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-white stroke-[1.9]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.8 7.2v5.4c0 4.5 3.1 6.9 7.2 8.4 4.1-1.5 7.2-3.9 7.2-8.4V7.2L12 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.4 11.2h5.2M10 8.8h4M10.6 13.8h2.8" />
                </svg>
            </span>
            <span className="relative hidden min-w-0 sm:block">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-100/70">Concierge</span>
                <span className="mt-0.5 block text-sm font-semibold text-white">AI Advisor</span>
            </span>
        </button>
    )
}

export default FloatingAIAdvisor
