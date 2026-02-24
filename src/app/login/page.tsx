"use client";

import { useState } from "react";
import { sendOTP, verifyOTP, signInWithGitHub, signInWithGoogle, signInWithPassword, signUpWithPassword } from "./actions";
import { Loader2, ArrowRight, Mail, Eye, EyeOff, Lock } from "lucide-react";

function GitHubIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}

function GoogleIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export default function LoginPage() {
    const [mode, setMode] = useState<"signin" | "signup" | "otp">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGitHubLoading, setIsGitHubLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isEmailSent, setIsEmailSent] = useState(false);

    const anyLoading = isLoading || isGitHubLoading || isGoogleLoading;

    function switchMode(newMode: "signin" | "signup") {
        setMode(newMode);
        setError(null);
        setSuccessMessage(null);
        setPassword("");
        setConfirmPassword("");
    }

    async function handleGoogleSignIn() {
        setIsGoogleLoading(true);
        setError(null);
        const result = await signInWithGoogle();
        if (result?.error) { setError(result.error); setIsGoogleLoading(false); }
    }

    async function handleGitHubSignIn() {
        setIsGitHubLoading(true);
        setError(null);
        const result = await signInWithGitHub();
        if (result?.error) { setError(result.error); setIsGitHubLoading(false); }
    }

    async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const result = await signInWithPassword(formData);
        setIsLoading(false);
        if (result?.error) setError(result.error);
    }

    async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setIsLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const result = await signUpWithPassword(formData);
        setIsLoading(false);
        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setIsEmailSent(true);
            setSuccessMessage(result.message ?? "Verification email sent!");
        }
    }

    async function handleSendOTP(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const result = await sendOTP(formData);
        setIsLoading(false);
        if (result?.error) { setError(result.error); } else { setMode("otp"); }
    }

    async function handleVerifyOTP(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const result = await verifyOTP(formData);
        setIsLoading(false);
        if (result?.error) setError(result.error);
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Logo */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-navy)] flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                        Z
                    </div>
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Zenith Finance</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {mode === "signup" ? "Create your account" : mode === "otp" ? "Enter your verification code" : "Sign in to your account"}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">

                    {isEmailSent ? (
                        <div className="text-center py-6">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">
                                We've sent a verification link to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>.
                                Please click the link to confirm your account.
                            </p>
                            <button
                                onClick={() => { setIsEmailSent(false); setMode("signin"); setSuccessMessage(null); }}
                                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:opacity-90 transition-all font-semibold"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Sign In / Sign Up Tab Toggle */}
                            {mode !== "otp" && (
                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signin")}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "signin"
                                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signup")}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "signup"
                                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            )}

                            {/* Feedback messages */}
                            {error && (
                                <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30">
                                    {error}
                                </div>
                            )}
                            {successMessage && (
                                <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm border border-green-200 dark:border-green-800/30">
                                    {successMessage}
                                </div>
                            )}

                            {/* ── OTP Verify Step ── */}
                            {mode === "otp" ? (
                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <input type="hidden" name="email" value={email} />
                                    <div>
                                        <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            One-Time Password
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                                            {email ? `We sent a 6-digit code to ${email}` : "Enter your 6-digit code"}
                                        </p>
                                        <input
                                            id="token"
                                            name="token"
                                            type="text"
                                            required
                                            autoComplete="one-time-code"
                                            className="block w-full text-center tracking-widest text-2xl border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 py-4 transition-colors font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]"
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify & Sign In"}
                                    </button>
                                    <button type="button" onClick={() => setMode("signin")} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-center">
                                        ← Back to Sign In
                                    </button>
                                </form>
                            ) : (
                                <>
                                    {/* ── OAuth Buttons ── */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button
                                            type="button"
                                            onClick={handleGoogleSignIn}
                                            disabled={anyLoading}
                                            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isGoogleLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <GoogleIcon />}
                                            Google
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleGitHubSignIn}
                                            disabled={anyLoading}
                                            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isGitHubLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <GitHubIcon />}
                                            GitHub
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or continue with email</span>
                                        </div>
                                    </div>

                                    {/* ── Sign In Form ── */}
                                    {mode === "signin" && (
                                        <form onSubmit={handleSignIn} className="space-y-4">
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Email address
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        autoComplete="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="block w-full pl-10 pr-4 py-3 sm:text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] transition-colors"
                                                        placeholder="you@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        id="password"
                                                        name="password"
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="current-password"
                                                        required
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-3 sm:text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] transition-colors"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={anyLoading}
                                                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                                            >
                                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setMode("otp"); setError(null); }}
                                                className="w-full text-center text-sm text-[var(--color-brand-navy)] hover:opacity-80 font-medium transition-colors"
                                            >
                                                Sign in with email OTP instead
                                            </button>
                                        </form>
                                    )}

                                    {/* ── Sign Up Form ── */}
                                    {mode === "signup" && (
                                        <form onSubmit={handleSignUp} className="space-y-4">
                                            <div>
                                                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Email address
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        id="signup-email"
                                                        name="email"
                                                        type="email"
                                                        autoComplete="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="block w-full pl-10 pr-4 py-3 sm:text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] transition-colors"
                                                        placeholder="you@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        id="signup-password"
                                                        name="password"
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        required
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-3 sm:text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] transition-colors"
                                                        placeholder="Min. 6 characters"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Confirm Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        id="confirm-password"
                                                        name="confirm-password"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-3 sm:text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] transition-colors"
                                                        placeholder="Re-enter password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={anyLoading}
                                                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                                            >
                                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
