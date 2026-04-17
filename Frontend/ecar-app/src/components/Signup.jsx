import axiosInstance from "../utils/axiosInstance"
import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { isAuthenticated, getDashboardRouteForRole, getRole } from "../utils/auth"

export default function Signup() {
    const navigate = useNavigate()
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const { register, handleSubmit, watch, formState: { errors } } = useForm()

    useEffect(() => {
        if (isAuthenticated()) {
            navigate(getDashboardRouteForRole(getRole()))
        }
    }, [navigate])

    const password = watch("password")

    const onSubmit = async (data) => {
        try {
            const payload = {
                ...data,
                name: String(data.name || "").trim(),
                email: String(data.email || "").trim().toLowerCase(),
                password: String(data.password || ""),
                confirmPassword: String(data.confirmPassword || ""),
            }
            const res = await axiosInstance.post("/user/register", payload)
            if (res.status === 201) {
                toast.success("Account created! Please login. 🎉")
                navigate("/login")
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Signup failed")
        }
    }

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'Syne', sans-serif", background: "#0a0a0f" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                .su-input { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
                .su-input:focus { transform: translateY(-1px); box-shadow: 0 0 0 3px rgba(99,102,241,0.25), 0 8px 24px rgba(99,102,241,0.15); }
                .su-btn { transition: all 0.3s ease; position: relative; overflow: hidden; }
                .su-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%); opacity: 0; transition: opacity 0.3s; }
                .su-btn:hover::before { opacity: 1; }
                .su-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(99,102,241,0.5); }
                .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .fu { animation: fadeUp 0.6s ease forwards; opacity: 0; }
                .fu-1 { animation-delay: 0.05s; } .fu-2 { animation-delay: 0.12s; } .fu-3 { animation-delay: 0.19s; } .fu-4 { animation-delay: 0.26s; } .fu-5 { animation-delay: 0.33s; } .fu-6 { animation-delay: 0.4s; }
                .step-pill { transition: all 0.3s; }
            `}</style>

            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-[45%] relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=90')", backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.4) 60%, rgba(139,92,246,0.2) 100%)" }} />
                <div className="noise absolute inset-0" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

                <div className="relative z-10 flex flex-col justify-between p-14 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.4)" }}>🚗</div>
                        <span className="text-white font-bold text-xl tracking-tight">E-CAR</span>
                    </div>

                    <div>
                        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                            ✦ Join 10,000+ Happy Car Buyers
                        </div>
                        <h2 className="text-white font-extrabold mb-4 leading-none" style={{ fontSize: "clamp(2.5rem, 4.5vw, 3.8rem)", letterSpacing: "-0.03em" }}>
                            Join<br /><span style={{ color: "#a78bfa" }}>E-CAR</span><br />Today.
                        </h2>
                        <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
                            Your journey to the perfect car starts with a single step.
                        </p>

                        {/* Feature pills */}
                        <div className="space-y-3">
                            {[
                                { icon: "🔍", text: "Smart search across 500+ cars" },
                                { icon: "⚖️", text: "Side-by-side comparison tool" },
                                { icon: "🤖", text: "AI-powered recommendations" },
                                { icon: "❤️", text: "Save your favorite cars" },
                            ].map((f, i) => (
                                <div key={i} className="step-pill flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <span>{f.icon}</span>
                                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif" }}>{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-[55%] flex items-center justify-center px-6 py-10 relative" style={{ background: "#0d0d15" }}>
                <div className="noise absolute inset-0" />
                <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />

                <div className="relative z-10 w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <span className="text-xl">🚗</span>
                        <span className="text-white font-bold text-xl">E-CAR</span>
                    </div>

                    <div className="fu fu-1 mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: "#8b5cf6" }}>Get Started</p>
                        <h1 className="text-white font-extrabold mb-2" style={{ fontSize: "2.25rem", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Create account</h1>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Free forever. No credit card required.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Name */}
                        <div className="fu fu-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Full Name</label>
                            <input
                                type="text"
                                placeholder="Rahul Sharma"
                                className="su-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
                                style={{ background: errors.name ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${errors.name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'DM Sans', sans-serif" }}
                                {...register("name", { required: "Name is required" })}
                            />
                            {errors.name && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.name.message}</p>}
                        </div>

                        {/* Email */}
                        <div className="fu fu-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="su-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
                                style={{ background: errors.email ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${errors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'DM Sans', sans-serif" }}
                                {...register("email", { required: "Email is required" })}
                            />
                            {errors.email && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div className="fu fu-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="su-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none pr-12"
                                    style={{ background: errors.password ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${errors.password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'DM Sans', sans-serif" }}
                                    {...register("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    {showPass ? "🙈" : "👁"}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.password.message}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div className="fu fu-5">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="su-input w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none pr-12"
                                    style={{ background: errors.confirmPassword ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${errors.confirmPassword ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'DM Sans', sans-serif" }}
                                    {...register("confirmPassword", { required: "Please confirm password", validate: (v) => v === password || "Passwords do not match" })}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    {showConfirm ? "🙈" : "👁"}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {errors.confirmPassword.message}</p>}
                        </div>

                        {/* Submit */}
                        <div className="fu fu-6 pt-2">
                            <button
                                type="submit"
                                className="su-btn w-full py-4 rounded-xl font-bold text-white text-sm"
                                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)", letterSpacing: "0.02em" }}
                            >
                                Create Account →
                            </button>
                        </div>

                        <p className="text-center text-sm pt-1" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
                            Already have an account?{" "}
                            <span onClick={() => navigate("/login")} className="font-semibold cursor-pointer" style={{ color: "#818cf8" }}>
                                Sign in →
                            </span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
