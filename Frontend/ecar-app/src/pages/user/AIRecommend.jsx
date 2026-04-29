import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import {
    fetchSubscriptionStatus,
    formatPlanName,
    isUnlimitedLimit,
    checkUsageWarnings,
} from '../../utils/subscription'

const initialAssistantMessage = {
    role: 'assistant',
    content: "Hi! I'm your AI car advisor. Tell me your budget, preferences, family size, or driving needs and I'll recommend the best matches from our collection.",
}

const quickPrompts = [
    'Best car under 8 lakh',
    'SUV for family of 5',
    'Electric car recommendation',
    'Best mileage hatchback',
    'Luxury sedan options',
]

const formatSessionDate = (value) => {
    if (!value) return 'New session'
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const AIRecommend = () => {
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [messages, setMessages] = useState([initialAssistantMessage])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [booting, setBooting] = useState(true)
    const [subscription, setSubscription] = useState(null)
    const [remainingChats, setRemainingChats] = useState('unlimited')
    const [limitReached, setLimitReached] = useState(false)
    const [resetsAt, setResetsAt] = useState(null)
    const messagesEndRef = useRef(null)

    const activeSession = useMemo(
        () => sessions.find((session) => session._id === currentSessionId) || null,
        [sessions, currentSessionId],
    )

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [status, sessionsRes] = await Promise.all([
                    fetchSubscriptionStatus(),
                    axiosInstance.get('/ai/sessions'),
                ])

                const fetchedSessions = sessionsRes.data.data || []
                setSubscription(status)
                setSessions(fetchedSessions)
                setRemainingChats(status?.usage?.aiChatsLimit === 'unlimited'
                    ? 'unlimited'
                    : Math.max((status?.usage?.aiChatsLimit || 0) - (status?.usage?.aiChatsToday || 0), 0))
                setLimitReached(status?.usage?.aiChatsLimit !== 'unlimited' && (status?.usage?.aiChatsToday || 0) >= (status?.usage?.aiChatsLimit || 0))

                if (fetchedSessions.length) {
                    await openSession(fetchedSessions[0]._id)
                } else {
                    await createSession(true)
                }

                // Show usage warnings if any
                const warnings = checkUsageWarnings(status.usage)
                warnings.forEach(w => {
                    if (w.type === 'ai') toast.info(w.message)
                })
            } catch (error) {
                toast.error('Unable to load AI advisor right now.')
                setMessages([initialAssistantMessage])
            } finally {
                setBooting(false)
            }
        }

        bootstrap()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const refreshSessions = async (preferredSessionId = currentSessionId) => {
        const res = await axiosInstance.get('/ai/sessions')
        const fetchedSessions = res.data.data || []
        setSessions(fetchedSessions)
        if (preferredSessionId) {
            setCurrentSessionId(preferredSessionId)
        }
    }

    const createSession = async (selectAfterCreate = false) => {
        const res = await axiosInstance.post('/ai/sessions')
        const session = res.data.data
        await refreshSessions(session._id)

        if (selectAfterCreate) {
            setCurrentSessionId(session._id)
            setMessages([initialAssistantMessage])
        }

        return session._id
    }

    const openSession = async (sessionId) => {
        const res = await axiosInstance.get(`/ai/sessions/${sessionId}`)
        const session = res.data.data
        setCurrentSessionId(session._id)
        setMessages(session.messages?.length ? session.messages : [initialAssistantMessage])
    }

    const deleteSession = async (sessionId) => {
        await axiosInstance.delete(`/ai/sessions/${sessionId}`)
        const remaining = sessions.filter((session) => session._id !== sessionId)
        setSessions(remaining)

        if (sessionId === currentSessionId) {
            if (remaining.length) {
                await openSession(remaining[0]._id)
            } else {
                await createSession(true)
            }
        }
    }

    const persistMessage = async (sessionId, message) => {
        await axiosInstance.post(`/ai/sessions/${sessionId}/messages`, message)
    }

    const sendMessage = async (preset) => {
        const value = (typeof preset === 'string' ? preset : input).trim()
        if (!value || loading || booting || limitReached) return

        let sessionId = currentSessionId
        if (!sessionId) {
            sessionId = await createSession(true)
        }

        const userMessage = { role: 'user', content: value }
        const nextMessages = [...messages, userMessage]
        setMessages(nextMessages)
        setInput('')
        setLoading(true)

        try {
            await persistMessage(sessionId, userMessage)
            const res = await axiosInstance.post('/ai/chat', {
                messages: nextMessages,
            })

            const assistantMessage = {
                role: 'assistant',
                content: res.data.data?.reply || res.data.reply,
            }
            await persistMessage(sessionId, assistantMessage)
            setMessages((prev) => [...prev, assistantMessage])
            setRemainingChats(res.data.data?.remainingChats ?? res.data.remainingChats ?? 'unlimited')
            setLimitReached(false)
            setResetsAt(res.data.data?.resetsAt || null)
            await refreshSessions(sessionId)
        } catch (error) {
            if (error.response?.status === 429) {
                setLimitReached(true)
                setResetsAt(error.response?.data?.resetsAt || null)
                setMessages((prev) => prev.slice(0, -1))
            } else {
                const errMsg = error.response?.data?.message || error.response?.data?.error || 'Unable to send your message right now.'
                if (error.response?.data?.limitReached) {
                    toast.warning(errMsg)
                    setLimitReached(true)
                } else {
                    toast.error(errMsg)
                }
                setMessages((prev) => prev.slice(0, -1))
            }
        } finally {
            setLoading(false)
        }
    }

    const explorerCounter = !isUnlimitedLimit(remainingChats)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .advisor-shell { font-family: 'DM Sans', sans-serif; }
                .advisor-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
            `}</style>

            <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 xl:grid-cols-[320px_1fr]">
                <aside className="advisor-shell border-b border-white/10 bg-slate-950/70 p-5 xl:border-b-0 xl:border-r">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">History</p>
                            <h2 className="advisor-title mt-1 text-2xl text-white">Past Sessions</h2>
                        </div>
                        <button
                            onClick={() => createSession(true)}
                            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                            New Chat
                        </button>
                    </div>

                    <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Your plan</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatPlanName(subscription?.plan)}</p>
                        {explorerCounter && (
                            <p className="mt-2 text-sm text-sky-200">{remainingChats} chats remaining today</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <button
                                key={session._id}
                                onClick={() => openSession(session._id)}
                                className={`w-full rounded-2xl border p-4 text-left transition ${session._id === currentSessionId ? 'border-indigo-400/35 bg-indigo-500/12' : 'border-white/8 bg-white/[0.03] hover:border-white/15'}`}
                            >
                                <div className="mb-2 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-white">{session.title || 'New Chat'}</p>
                                        <p className="mt-1 text-xs text-slate-400">{formatSessionDate(session.lastMessageAt)}</p>
                                    </div>
                                    <span
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            deleteSession(session._id).catch(() => toast.error('Unable to delete that chat.'))
                                        }}
                                        className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400"
                                    >
                                        Del
                                    </span>
                                </div>
                                <p className="line-clamp-2 text-sm leading-6 text-slate-400">{session.preview}</p>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="advisor-shell flex min-h-screen flex-col">
                    <div className="border-b border-white/10 px-6 py-8">
                        <div className="mx-auto max-w-4xl">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white">
                                    AI
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="advisor-title text-2xl text-white">AI Car Advisor</h1>
                                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200">
                                            {formatPlanName(subscription?.plan)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400">Ask about budget, fuel type, family use, or shortlist strategy.</p>
                                </div>
                            </div>

                            {explorerCounter && (
                                <p className="mt-4 text-sm text-sky-200">{remainingChats} chats remaining today</p>
                            )}
                            {limitReached && (
                                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                                    Daily limit reached. Resets at midnight{resetsAt ? ` (${new Date(resetsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })})` : ''}.{' '}
                                    <Link to="/user/pricing" className="font-semibold text-white underline">Upgrade for unlimited</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mx-auto w-full max-w-4xl px-6 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick asks</p>
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={limitReached}
                                    className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 disabled:opacity-40"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto flex-1 w-full max-w-4xl overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 260 }}>
                        {booting ? (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
                                Loading your chat history...
                            </div>
                        ) : messages.map((msg, index) => (
                            <div key={`${msg.role}-${index}-${msg.content.slice(0, 18)}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="mr-3 mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                                        AI
                                    </div>
                                )}
                                <div
                                    className="max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-5 py-4 text-sm leading-7"
                                    style={{
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: msg.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                                    AI
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-5 py-4 text-sm text-slate-300">
                                    Thinking through your inventory and current plan...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="mx-auto w-full max-w-4xl border-t border-white/10 px-6 py-6">
                        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>{activeSession ? `Active session: ${activeSession.title}` : 'No active session'}</span>
                            <span>{messages.length} messages</span>
                        </div>
                        <div className="flex gap-3">
                            <input
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && sendMessage()}
                                placeholder="Ask about budget, mileage, fuel type, family size, or body type..."
                                disabled={limitReached}
                                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-white outline-none disabled:opacity-50"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || booting || !input.trim() || limitReached}
                                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-4 text-sm font-semibold text-white disabled:opacity-40"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default AIRecommend


