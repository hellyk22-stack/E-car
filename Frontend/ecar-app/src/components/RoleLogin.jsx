import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"
import axiosInstance from "../utils/axiosInstance"
import { getDashboardRouteForRole, getRole, isAuthenticated } from "../utils/auth"

const accountOptions = [
    { value: "user", label: "User / Admin", endpoint: "/user/login" },
    { value: "showroom", label: "Showroom", endpoint: "/showroom/login" },
]

const RoleLogin = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const [form, setForm] = useState({ email: "", password: "" })
    const [accountType, setAccountType] = useState("user")
    const [submitting, setSubmitting] = useState(false)
    const [approvalRequest, setApprovalRequest] = useState(location.state?.approvalRequest || null)
    const returnTo = searchParams.get("returnTo")

    const getPostLoginRoute = (role) => {
        if (returnTo) {
            const decoded = decodeURIComponent(returnTo)
            if (decoded.startsWith("/admin") && role !== "admin") return "/403"
            if (decoded.startsWith("/showroom") && role !== "showroom") return "/403"
            if (decoded.startsWith("/user") && role !== "user") return "/403"
            if (decoded.startsWith("/")) return decoded
        }

        return getDashboardRouteForRole(role)
    }

    useEffect(() => {
        if (isAuthenticated()) {
            navigate(getPostLoginRoute(getRole()), { replace: true })
        }
    }, [navigate, returnTo])

    useEffect(() => {
        if (location.state?.approvalRequest) {
            setAccountType("showroom")
        }
    }, [location.state])

    const submitHandler = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        try {
            setApprovalRequest(null)
            const endpoint = accountOptions.find((item) => item.value === accountType)?.endpoint || "/user/login"
            const payloadInput = {
                ...form,
                email: String(form.email || "").trim().toLowerCase(),
                password: String(form.password || ""),
            }
            const res = await axiosInstance.post(endpoint, payloadInput)
            const payload = {
                ...res.data,
                ...(res.data?.data || {}),
            }
            const role = payload.role || (accountType === "showroom" ? "showroom" : "user")
            localStorage.setItem("token", payload.token)
            localStorage.setItem("role", role)
            localStorage.setItem("name", payload.name || "User")
            toast.success("Welcome back!")
            navigate(getPostLoginRoute(role), { replace: true })
        } catch (error) {
            if (accountType === "showroom" && error.response?.data?.data?.pendingApproval) {
                setApprovalRequest(error.response.data.data.showroom || null)
            }
            toast.error(error.response?.data?.message || "Login failed")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] border border-white/10 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative hidden min-h-[680px] p-12 lg:block" style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(37,99,235,0.35))" }}>
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 25%), radial-gradient(circle at 80% 20%, rgba(191,219,254,0.2), transparent 20%), linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "auto, auto, 50px 50px, 50px 50px" }} />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "#93c5fd" }}>E-CAR Platform</p>
                            <h1 className="mt-4 text-5xl font-black text-white">Book smarter test drives.</h1>
                            <p className="mt-5 max-w-xl text-base leading-8" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "'DM Sans', sans-serif" }}>
                                Discover cars, compare options, connect with showrooms, and manage the full test drive journey from one place.
                            </p>
                        </div>
                        <div className="grid gap-4">
                            {[
                                "Users can browse showrooms and book home or in-showroom test drives.",
                                "Showrooms manage inventory, staff assignment, and slot availability.",
                                "Admins approve partners and monitor bookings across the system.",
                            ].map((item) => (
                                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                                    <p className="text-sm text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-[#0d0d15] p-8 md:p-12">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#818cf8" }}>Welcome back</p>
                    <h2 className="mt-3 text-4xl font-black text-white">Sign in</h2>
                    <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.48)", fontFamily: "'DM Sans', sans-serif" }}>
                        Choose your account type and continue to the right workspace.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        {accountOptions.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                    setAccountType(item.value)
                                    if (item.value !== "showroom") {
                                        setApprovalRequest(null)
                                    }
                                }}
                                className="rounded-2xl px-4 py-3 text-sm font-semibold"
                                style={{
                                    background: accountType === item.value ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.04)",
                                    color: "white",
                                    border: accountType === item.value ? "none" : "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submitHandler} className="mt-8 space-y-4">
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.45)" }}>Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                                placeholder="you@example.com"
                                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.45)" }}>Password</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                                placeholder="••••••••"
                                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                        >
                            {submitting ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    {accountType === "showroom" && approvalRequest && (
                        <div className="mt-6 rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#fde68a" }}>Approval Request Received</p>
                            <h3 className="mt-2 text-xl font-bold text-white">{approvalRequest.name}</h3>
                            <p className="mt-3 text-sm leading-6 text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Your showroom login is blocked until an admin approves the request.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">City</p>
                                    <p className="mt-1 text-sm text-white">{approvalRequest.city || "Pending"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Pincode</p>
                                    <p className="mt-1 text-sm text-white">{approvalRequest.pincode || "Pending"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 md:col-span-2">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Submitted</p>
                                    <p className="mt-1 text-sm text-white">
                                        {approvalRequest.submittedAt
                                            ? new Date(approvalRequest.submittedAt).toLocaleString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })
                                            : "Just now"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <button type="button" onClick={() => navigate("/signup")} className="text-indigo-300">
                            Create user account
                        </button>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                        <button type="button" onClick={() => navigate("/showroom/register")} className="text-sky-300">
                            Register showroom
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RoleLogin
