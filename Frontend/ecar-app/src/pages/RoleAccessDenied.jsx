import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { getDashboardRouteForRole, getRole } from "../utils/auth"

const RoleAccessDenied = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const role = getRole()

    return (
        <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 35%), #0a0a0f", fontFamily: "'Syne', sans-serif" }}>
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl backdrop-blur-xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-rose-300">403</p>
                <h1 className="mb-3 text-4xl font-extrabold text-white md:text-5xl">Access Denied</h1>
                <p className="mx-auto mb-8 max-w-lg text-sm leading-7 text-slate-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    You do not have permission to open this page.
                    {location.state?.from ? ` Requested route: ${location.state.from}.` : ""}
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        onClick={() => navigate(getDashboardRouteForRole(role))}
                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white"
                    >
                        Go to Dashboard
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RoleAccessDenied
