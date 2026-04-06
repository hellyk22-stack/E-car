import axiosInstance from "../utils/axiosInstance"
import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"
import { isAuthenticated, getRole } from "../utils/auth"

export default function Login() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [submitting, setSubmitting] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const { register, handleSubmit, formState: { errors } } = useForm()
    const returnTo = searchParams.get("returnTo")

    const getPostLoginRoute = (role) => {
        if (returnTo) {
            const decodedReturnTo = decodeURIComponent(returnTo)
            if (decodedReturnTo.startsWith("/admin") && role !== "admin") return "/403"
            if (decodedReturnTo.startsWith("/")) return decodedReturnTo
        }

        return role === "admin" ? "/admin/analytics" : "/user/search"
    }

    useEffect(() => {
        if (isAuthenticated()) {
            navigate(getPostLoginRoute(getRole()), { replace: true })
        }
    }, [navigate, returnTo])

    const submitHandler = async (data) => {
        setSubmitting(true)
        try {
            const res = await axiosInstance.post("/user/login", data)
            const { token, role, name } = res.data
            localStorage.setItem("token", token)
            localStorage.setItem("role", role)
            localStorage.setItem("name", name || "User")
            toast.success("Welcome back!")
            navigate(getPostLoginRoute(role), { replace: true })
        } catch (err) {
            toast.error(err.response?.data?.message || "Login failed")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'Syne', sans-serif", background: "#0a0a0f" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                .login-input { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
                .login-input:focus { transform: translateY(-1px); box-shadow: 0 0 0 3px rgba(99,102,241,0.25), 0 8px 24px rgba(99,102,241,0.15); }
                .glow-btn { position: relative; overflow: hidden; transition: all 0.3s ease; }
                .glow-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%); opacity: 0; transition: opacity 0.3s; }
                .glow-btn:hover::before { opacity: 1; }
                .glow-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(99,102,241,0.5); }
                .glow-btn:active { transform: translateY(0); }
                .car-bg { background-image: url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=90'); background-size: cover; background-position: center; }
                .float-label { transition: all 0.25s ease; }
                .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .shimmer-line { animation: shimmer 2.5s infinite; }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .fade-up { animation: fadeUp 0.6s ease forwards; }
                .fade-up-d1 { animation-delay: 0.1s; opacity: 0; }
                .fade-up-d2 { animation-delay: 0.2s; opacity: 0; }
                .fade-up-d3 { animation-delay: 0.3s; opacity: 0; }
                .fade-up-d4 { animation-delay: 0.4s; opacity: 0; }
            `}</style>

            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-[55%] relative car-bg">
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.3) 50%, rgba(99,102,241,0.2) 100%)" }} />
                <div className="noise absolute inset-0" />
                {/* Decorative grid */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

                <div className="relative z-10 flex flex-col justify-between p-14 w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.4)" }}>🚗</div>
                        <span className="text-white font-bold text-xl tracking-tight">E-CAR</span>
                    </div>

                    {/* Bottom content */}
                    <div>
                        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                            ✦ India's Premium Car Discovery Platform
                        </div>
                        <h2 className="text-white font-extrabold mb-4 leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em" }}>
                            Drive Your<br /><span style={{ color: "#818cf8" }}>Dream Car.</span>
                        </h2>
                        <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
                            Search, compare and choose from 500+ verified cars across India.
                        </p>

                        {/* Testimonial */}
                        <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                            <div className="flex gap-1 mb-3">
                                {[1,2,3,4,5].map(i => <span key={i} style={{ color: "#fbbf24", fontSize: 14 }}>★</span>)}
                            </div>
                            <p className="text-sm italic mb-3" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}>"Found my perfect Nexon EV in under 10 minutes. The comparison tool is incredible."</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>R</div>
                                <div>
                                    <p className="text-white text-xs font-semibold">Rohan Mehta</p>
                                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Purchased Tata Nexon EV</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 relative" style={{ background: "#0d0d15" }}>
                <div className="noise absolute inset-0" />
                {/* Glow orb */}
                <div className="absolute top-20 right-10 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />

                <div className="relative z-10 w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <span className="text-xl">🚗</span>
                        <span className="text-white font-bold text-xl">E-CAR</span>
                    </div>

                    <div className="fade-up fade-up-d1 mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: "#6366f1" }}>Welcome Back</p>
                        <h1 className="text-white font-extrabold mb-2" style={{ fontSize: "2.25rem", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Sign in</h1>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Enter your credentials to continue</p>
                    </div>

                    <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
                        {/* Email */}
                        <div className="fade-up fade-up-d2">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="login-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
                                style={{
                                    background: errors.email ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)",
                                    border: `1px solid ${errors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                                    fontFamily: "'DM Sans', sans-serif"
                                }}
                                {...register("email", { required: "Email is required" })}
                            />
                            {errors.email && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div className="fade-up fade-up-d3">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="login-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none pr-12"
                                    style={{
                                        background: errors.password ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)",
                                        border: `1px solid ${errors.password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                                        fontFamily: "'DM Sans', sans-serif"
                                    }}
                                    {...register("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    {showPass ? "🙈" : "👁"}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.password.message}</p>}
                        </div>

                        {/* Submit */}
                        <div className="fade-up fade-up-d4 pt-2">
                            <button
                                disabled={submitting}
                                type="submit"
                                className="glow-btn w-full py-4 rounded-xl font-bold text-white text-sm relative overflow-hidden"
                                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", letterSpacing: "0.02em" }}
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                        Signing in...
                                    </span>
                                ) : "Sign In →"}
                            </button>
                        </div>

                        <p className="text-center text-sm pt-2" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
                            No account?{" "}
                            <span onClick={() => navigate("/signup")} className="font-semibold cursor-pointer" style={{ color: "#818cf8" }}>
                                Create one free →
                            </span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
