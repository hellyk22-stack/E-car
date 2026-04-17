import React from 'react'

const Pagination = ({ page = 1, totalPages = 1, onChange }) => {
    if (totalPages <= 1) return null

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

    return (
        <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                Previous
            </button>
            {pages.map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => onChange(item)}
                    className="h-10 min-w-10 rounded-xl px-3 text-sm font-semibold"
                    style={{
                        background: item === page ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.04)',
                        color: 'white',
                        border: item === page ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {item}
                </button>
            ))}
            <button
                type="button"
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                Next
            </button>
        </div>
    )
}

export default Pagination
