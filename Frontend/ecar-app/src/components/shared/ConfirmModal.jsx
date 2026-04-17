import React from 'react'

const ConfirmModal = ({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Keep it',
    confirmTone = 'danger',
    loading = false,
    onConfirm,
    onClose,
}) => {
    if (!open) return null

    const confirmStyles = confirmTone === 'success'
        ? { background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }
        : { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.25)', color: '#fecaca' }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" style={{ background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-[28px] p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fca5a5' }}>Confirmation</p>
                <h3 className="mt-3 text-2xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'DM Sans', sans-serif" }}>
                    {message}
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
                        style={confirmStyles}
                    >
                        {loading ? 'Please wait...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal
