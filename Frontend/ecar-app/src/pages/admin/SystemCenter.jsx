import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'

const formatDateTime = (value) => {
    if (!value) return '--'
    return new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

const SystemCenter = () => {
    const [form, setForm] = useState({ title: '', message: '' })
    const [notifications, setNotifications] = useState([])
    const [logs, setLogs] = useState([])
    const [logsMeta, setLogsMeta] = useState({ page: 1, totalPages: 1, total: 0 })
    const [logSearchInput, setLogSearchInput] = useState('')
    const [logSearch, setLogSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [logsPage, setLogsPage] = useState(1)

    const fetchSystemData = async (page = logsPage, search = logSearch) => {
        setLoading(true)
        try {
            const [notificationsRes, logsRes] = await Promise.all([
                axiosInstance.get('/notification/admin'),
                axiosInstance.get(`/system/activity-logs?page=${page}&limit=12&search=${encodeURIComponent(search)}`),
            ])

            setNotifications(notificationsRes.data.data || [])
            setLogs(logsRes.data.data || [])
            setLogsMeta(logsRes.data.meta || { page: 1, totalPages: 1, total: 0 })
        } catch (err) {
            console.error('Failed to load system data', err)
            toast.error('Unable to load system data right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSystemData(logsPage, logSearch)
    }, [logsPage, logSearch])

    const handleBroadcast = async (event) => {
        event.preventDefault()
        if (!form.title.trim() || !form.message.trim()) {
            toast.info('Add both a title and message before broadcasting.')
            return
        }

        setSubmitting(true)
        try {
            await axiosInstance.post('/notification/admin', {
                title: form.title.trim(),
                message: form.message.trim(),
            })
            toast.success('Notification broadcasted.')
            setForm({ title: '', message: '' })
            fetchSystemData(logsPage, logSearch)
        } catch (err) {
            console.error('Failed to broadcast notification', err)
            toast.error(err.response?.data?.message || 'Unable to broadcast notification.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogSearch = (event) => {
        event.preventDefault()
        setLogsPage(1)
        setLogSearch(logSearchInput.trim())
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .system-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
            `}</style>

            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">System</p>
                <h1 className="system-title mt-1 text-3xl font-bold text-white md:text-4xl">Broadcast & Audit Center</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                    Send in-app notifications to users and review a timeline of admin actions across the platform.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
                <div className="space-y-6">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Broadcaster</p>
                        <h2 className="system-title mt-1 text-2xl text-white">Send Notification</h2>
                        <form className="mt-5 space-y-4" onSubmit={handleBroadcast}>
                            <input
                                value={form.title}
                                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                                placeholder="Short title"
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                            />
                            <textarea
                                value={form.message}
                                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                                placeholder="Broadcast message users will see in the navbar bell dropdown"
                                rows={5}
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {submitting ? 'Broadcasting...' : 'Broadcast Notification'}
                            </button>
                        </form>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                        <div className="mb-4 flex items-end justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Recent</p>
                                <h2 className="system-title mt-1 text-2xl text-white">Sent Notifications</h2>
                            </div>
                            <button
                                onClick={() => fetchSystemData(logsPage, logSearch)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-3">
                            {loading && notifications.length === 0 && <p className="text-sm text-slate-400">Loading notifications...</p>}
                            {!loading && notifications.length === 0 && <p className="text-sm text-slate-400">No notifications sent yet.</p>}
                            {notifications.map((item) => (
                                <div key={item._id} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{item.title}</p>
                                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p>
                                        </div>
                                        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
                                            {item.readCount || 0} reads
                                        </span>
                                    </div>
                                    <p className="mt-3 text-xs text-slate-500">
                                        Sent by {item.createdByName || 'Admin'} · {formatDateTime(item.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Audit Trail</p>
                            <h2 className="system-title mt-1 text-2xl text-white">Activity Log</h2>
                            <p className="mt-2 text-sm text-slate-400">{logsMeta.total} recorded admin actions</p>
                        </div>
                        <form className="flex gap-2" onSubmit={handleLogSearch}>
                            <input
                                value={logSearchInput}
                                onChange={(event) => setLogSearchInput(event.target.value)}
                                placeholder="Search logs"
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white outline-none"
                            />
                            <button className="rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white" type="submit">
                                Filter
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {loading && logs.length === 0 && <p className="text-sm text-slate-400">Loading activity logs...</p>}
                        {!loading && logs.length === 0 && <p className="text-sm text-slate-400">No activity logs found.</p>}
                        {logs.map((log) => (
                            <div key={log._id} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                                        {log.action}
                                    </span>
                                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
                                        {log.entityType}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm font-medium text-white">{log.description}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                    {log.actorName} · {formatDateTime(log.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                        <button
                            onClick={() => setLogsPage((prev) => Math.max(prev - 1, 1))}
                            disabled={logsMeta.page <= 1}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setLogsPage((prev) => Math.min(prev + 1, logsMeta.totalPages))}
                            disabled={logsMeta.page >= logsMeta.totalPages}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SystemCenter
