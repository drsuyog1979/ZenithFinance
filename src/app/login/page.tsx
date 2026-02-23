"use client";

import { useState } from "react";
import { sendOTP, verifyOTP } from "./actions";
import { Loader2, ArrowRight, Mail } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [step, setStep] = useState<"email" | "otp">("email");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSendEmail(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await sendOTP(formData);

        setIsLoading(false);

        if (result?.error) {
            setError(result.error);
        } else {
            setStep("otp");
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-navy)] flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                        Z
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Zenith Finance
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in or create an account to continue
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">

                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30">
                            {error}
                        </div>
                    )}

                    {step === "email" ? (
                        <form onSubmit={handleSendEmail} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email address
                                </label>
                                <div className="mt-2 relative rounded-md shadow-sm">
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
                                        className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-[var(--color-brand-navy)] focus:border-[var(--color-brand-navy)] py-3 transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brand-navy)] dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    <>
                                        Continue with Email
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form action={verifyOTP} className="space-y-6">
                            <input type="hidden" name="email" value={email} />

                            <div>
                                <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    One-Time Password
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                                    We sent a 6-digit code to {email}
                                </p>
                                <input
                                    id="token"
                                    name="token"
                                    type="text"
                                    required
                                    autoComplete="one-time-code"
                                    className="block w-full text-center tracking-widest text-2xl border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-[var(--color-brand-navy)] focus:border-[var(--color-brand-navy)] py-4 transition-colors font-mono"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] focus:outline-none transition-colors"
                            >
                                Verify & Sign In
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="w-full flex justify-center py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
