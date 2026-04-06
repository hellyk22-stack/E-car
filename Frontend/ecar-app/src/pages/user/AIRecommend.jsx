import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'

const currencyFormatter = new Intl.NumberFormat('en-IN')

const initialAssistantMessage = {
    role: 'assistant',
    content:
        "Hi! I'm your AI car advisor. Tell me your budget, preferences, family size, or driving needs and I'll recommend the best matches from our collection.\n\nExample: 'I need an SUV under 15 lakh for a family of 5' or 'Best mileage hatchback for city driving'.",
}

const quickPrompts = [
    'Best car under 8 lakh',
    'SUV for family of 5',
    'Electric car recommendation',
    'Best mileage hatchback',
    'Luxury sedan options',
]

const parseBudget = (text) => {
    const lower = text.toLowerCase()
    const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*lakh/)
    if (lakhMatch) return Number(lakhMatch[1]) * 100000

    const rupeeMatch = lower.match(/(?:rs|rupees|inr)\s*(\d+(?:\.\d+)?)/)
    if (rupeeMatch) {
        const raw = Number(rupeeMatch[1])
        return raw < 1000 ? raw * 100000 : raw
    }

    const underMatch = lower.match(/under\s*(\d+(?:\.\d+)?)/)
    if (underMatch) {
        const raw = Number(underMatch[1])
        return raw < 1000 ? raw * 100000 : raw
    }

    return null
}

const getTypePreference = (text) => {
    const lower = text.toLowerCase()
    if (lower.includes('suv')) return 'SUV'
    if (lower.includes('sedan')) return 'Sedan'
    if (lower.includes('hatchback')) return 'Hatchback'
    if (lower.includes('luxury')) return 'Luxury'
    return null
}

const getFuelPreference = (text) => {
    const lower = text.toLowerCase()
    if (lower.includes('electric') || lower.includes('ev')) return 'Electric'
    if (lower.includes('diesel')) return 'Diesel'
    if (lower.includes('petrol')) return 'Petrol'
    return null
}

const getTransmissionPreference = (text) => {
    const lower = text.toLowerCase()
    if (lower.includes('automatic')) return 'Automatic'
    if (lower.includes('manual')) return 'Manual'
    return null
}

const getSeatRequirement = (text) => {
    const lower = text.toLowerCase()
    const familyMatch = lower.match(/family of (\d+)/)
    if (familyMatch) return Number(familyMatch[1])

    const seatMatch = lower.match(/(\d+)\s*(?:seat|seater|seats)/)
    if (seatMatch) return Number(seatMatch[1])

    return null
}

const buildReason = (car, preferences) => {
    const reasons = []

    if (preferences.type && car.type === preferences.type) reasons.push(`${car.type.toLowerCase()} body style match`)
    if (preferences.fuel && car.fuel === preferences.fuel) reasons.push(`${car.fuel.toLowerCase()} powertrain match`)
    if (preferences.transmission && car.transmission === preferences.transmission) reasons.push(`${car.transmission.toLowerCase()} transmission`)
    if (preferences.budget && car.price <= preferences.budget) reasons.push(`within your budget at Rs ${currencyFormatter.format(car.price || 0)}`)
    if (preferences.seats && Number(car.seating) >= preferences.seats) reasons.push(`comfortable for ${preferences.seats} passengers`)
    if (!reasons.length) reasons.push('strong overall fit based on price, rating, and usability')

    return reasons.slice(0, 2).join(', ')
}

const scoreCar = (car, preferences, text) => {
    let score = Number(car.rating || 0) * 8

    if (preferences.budget) {
        if (car.price <= preferences.budget) score += 30
        else {
            const overBy = car.price - preferences.budget
            score -= Math.min(30, overBy / 50000)
        }
    }

    if (preferences.type && car.type === preferences.type) score += 22
    if (preferences.fuel && car.fuel === preferences.fuel) score += 20
    if (preferences.transmission && car.transmission === preferences.transmission) score += 10
    if (preferences.seats && Number(car.seating || 0) >= preferences.seats) score += 16

    const lower = text.toLowerCase()
    if (lower.includes('mileage') || lower.includes('efficient') || lower.includes('city')) score += Number(car.mileage || 0)
    if (lower.includes('luxury') && car.type === 'Luxury') score += 20
    if (lower.includes('family') && Number(car.seating || 0) >= 5) score += 8
    if (lower.includes('best')) score += Number(car.rating || 0) * 2

    return score
}

const generateRecommendation = (query, cars) => {
    if (!cars.length) {
        return "I can't see the car inventory right now, so I can't recommend accurately yet. Please try again after the car list loads."
    }

    const preferences = {
        budget: parseBudget(query),
        type: getTypePreference(query),
        fuel: getFuelPreference(query),
        transmission: getTransmissionPreference(query),
        seats: getSeatRequirement(query),
    }

    const ranked = [...cars]
        .map((car) => ({ car, score: scoreCar(car, preferences, query) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.car)

    if (!ranked.length) {
        return 'I could not find a strong match right now. Try asking with a budget, body type, fuel choice, or family size.'
    }

    const intro = preferences.budget
        ? `I found the best matches under roughly Rs ${currencyFormatter.format(preferences.budget)} from your current inventory:`
        : 'I found these strong matches from your current inventory:'

    const lines = ranked.map((car, index) => {
        const reason = buildReason(car, preferences)
        return `${index + 1}. ${car.name} (${car.brand})\nPrice: Rs ${currencyFormatter.format(car.price || 0)} | ${car.type} | ${car.fuel} | ${car.transmission} | ${car.mileage} km | ${car.seating} seats | Rating ${car.rating}/5\nWhy it fits: ${reason}.`
    })

    return `${intro}\n\n${lines.join('\n\n')}\n\nIf you want, I can also narrow this down further by budget, fuel type, or city vs highway usage.`
}

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
    const [cars, setCars] = useState([])
    const messagesEndRef = useRef(null)

    const activeSession = useMemo(
        () => sessions.find((session) => session._id === currentSessionId) || null,
        [sessions, currentSessionId],
    )

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [carsRes, sessionsRes] = await Promise.all([
                    axiosInstance.get('/car/cars'),
                    axiosInstance.get('/ai/sessions'),
                ])

                const inventory = carsRes.data.data || []
                const fetchedSessions = sessionsRes.data.data || []
                setCars(inventory)
                setSessions(fetchedSessions)

                if (fetchedSessions.length) {
                    await openSession(fetchedSessions[0]._id)
                } else {
                    await createSession(true)
                }
            } catch (err) {
                console.log('AI advisor bootstrap failed', err)
                toast.error('Unable to load AI chat history right now.')
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
            setMessages(session.messages?.length ? session.messages : [initialAssistantMessage])
        }

        return session._id
    }

    const openSession = async (sessionId) => {
        try {
            const res = await axiosInstance.get(`/ai/sessions/${sessionId}`)
            const session = res.data.data
            setCurrentSessionId(session._id)
            setMessages(session.messages?.length ? session.messages : [initialAssistantMessage])
        } catch (err) {
            console.log('Failed to open session', err)
            toast.error('Unable to open that chat session.')
        }
    }

    const deleteSession = async (sessionId) => {
        try {
            await axiosInstance.delete(`/ai/sessions/${sessionId}`)
            const remainingSessions = sessions.filter((session) => session._id !== sessionId)
            setSessions(remainingSessions)

            if (sessionId === currentSessionId) {
                if (remainingSessions.length) {
                    await openSession(remainingSessions[0]._id)
                } else {
                    const newId = await createSession(true)
                    setCurrentSessionId(newId)
                }
            }
        } catch (err) {
            console.log('Failed to delete session', err)
            toast.error('Unable to delete that chat session.')
        }
    }

    const persistMessage = async (sessionId, message) => {
        await axiosInstance.post(`/ai/sessions/${sessionId}/messages`, message)
    }

    const sendMessage = async (preset) => {
        const value = (typeof preset === 'string' ? preset : input).trim()
        if (!value || loading || booting) return

        let sessionId = currentSessionId
        if (!sessionId) {
            sessionId = await createSession(true)
        }

        const userMsg = { role: 'user', content: value }
        const nextMessages = [...messages, userMsg]
        setMessages(nextMessages)
        setInput('')
        setLoading(true)

        try {
            await persistMessage(sessionId, userMsg)

            const apiMessages = nextMessages
                .filter((message) => message.role === 'user' || message.role === 'assistant')
                .map((message) => ({ role: message.role, content: message.content }))

            let reply
            try {
                const res = await axiosInstance.post('/ai/chat', {
                    messages: apiMessages,
                    carInventory: cars,
                })
                reply = res.data?.reply || generateRecommendation(value, cars)
            } catch (err) {
                reply = `${generateRecommendation(value, cars)}\n\nNote: Live AI service is unavailable right now, so this response was generated from your local inventory data.`
            }

            const assistantMsg = { role: 'assistant', content: reply }
            await persistMessage(sessionId, assistantMsg)
            window.localStorage.setItem('aiChatCount', String(parseInt(window.localStorage.getItem('aiChatCount') || '0') + 1))
            setMessages((prev) => [...prev, assistantMsg])
            await refreshSessions(sessionId)
        } catch (err) {
            console.log('AI send failed', err)
            toast.error('Unable to save this message right now.')
        } finally {
            setLoading(false)
        }
    }

    const formatMessage = (text) => (
        text.split('\n').map((line, index) => {
            if (/^\d+\./.test(line)) {
                return <p key={index} className="mb-2 font-semibold text-white">{line}</p>
            }
            if (line.startsWith('Price:') || line.startsWith('Why it fits:')) {
                return <p key={index} className="mb-2 text-slate-300">{line}</p>
            }
            return line ? <p key={index} className="mb-2">{line}</p> : <div key={index} className="mb-2" />
        })
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .advisor-shell { font-family: 'DM Sans', sans-serif; }
                .advisor-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .msg-bubble { animation: fadeUp 0.35s ease forwards; }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .chat-input { transition: all 0.3s; }
                .chat-input:focus { box-shadow: 0 0 0 2px rgba(99,102,241,0.35); }
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
                                            deleteSession(session._id)
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
                        <div className="mx-auto flex max-w-4xl items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white shadow-[0_12px_30px_rgba(99,102,241,0.35)]">
                                AI
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="advisor-title text-2xl text-white">AI Car Advisor</h1>
                                    <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                        Memory On
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400">Saved per user, resumable across sessions, with live AI plus inventory fallback.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto w-full max-w-4xl px-6 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick asks</p>
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => sendMessage(prompt)}
                                    className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/15"
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
                        ) : messages.map((msg, i) => (
                            <div key={`${msg.role}-${i}-${msg.content.slice(0, 18)}`} className={`msg-bubble flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="mr-3 mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                                        AI
                                    </div>
                                )}
                                <div
                                    className="max-w-[82%] rounded-2xl px-5 py-4 text-sm leading-7"
                                    style={{
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: msg.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                                    }}
                                >
                                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="msg-bubble flex justify-start">
                                <div className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                                    AI
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-5 py-4 text-sm text-slate-300">
                                    Thinking through your inventory and past context...
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
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Ask about budget, mileage, fuel type, family size, or body type..."
                                className="chat-input flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-white outline-none"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || booting || !input.trim()}
                                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-4 text-sm font-semibold text-white disabled:opacity-40"
                            >
                                Send
                            </button>
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-500">Conversation history is stored in MongoDB per user and resumes automatically.</p>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default AIRecommend
