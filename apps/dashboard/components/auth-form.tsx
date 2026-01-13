"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useFullevent } from "@fullevent/react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { checkEmailExists } from "@/app/actions/auth";
import { GridLoader } from "@/components/ui/grid-loader";

type AuthMode = "signin" | "signup";

interface AuthFormProps {
    mode: AuthMode;
    setMode: (mode: AuthMode) => void;
    email: string;
    setEmail: (email: string) => void;
    name: string;
    setName: (name: string) => void;
}

export default function AuthForm({
    mode,
    setMode,
    email,
    setEmail,
    name,
    setName,
}: AuthFormProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const router = useRouter();
    const { createEvent } = useFullevent();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const event = createEvent(mode === "signup" ? "auth.signup" : "auth.signin");
        event.set("email", email);

        try {
            if (mode === "signup") {
                await authClient.signUp.email({
                    email,
                    password,
                    name,
                    callbackURL: "/dashboard",
                }, {
                    onSuccess: (ctx) => {
                        event.set("user", {
                            id: ctx.data?.user?.id,
                            name: ctx.data?.user?.name,
                            email: ctx.data?.user?.email,
                        });
                        event.emit();
                        setLoading(false);
                        router.push("/dashboard");
                    },
                    onError: (ctx) => {
                        event.setError(ctx.error);
                        event.emit();
                        setError(ctx.error.message);
                        setLoading(false);
                    }
                });
            } else {
                await authClient.signIn.email({
                    email,
                    password,
                }, {
                    onSuccess: () => {
                        event.emit();
                        setLoading(false);
                        router.push("/dashboard");
                    },
                    onError: (ctx) => {
                        event.setError(ctx.error);
                        event.emit();
                        setError(ctx.error.message);
                        setLoading(false);
                    }
                });
            }
        } catch {
            setLoading(false);
        }
    };

    const handleNextStep = async () => {
        setError(null);
        if (step === 1 && name.trim()) {
            setStep(2);
        } else if (step === 2 && email.trim()) {
            if (!email.includes("@")) {
                setError("Please enter a valid email address");
                return;
            }

            setCheckingEmail(true);
            try {
                const exists = await checkEmailExists(email);
                if (exists) {
                    setError("An account with this email already exists.");
                    return;
                }
                setStep(3);
            } catch {
                // If check fails, proceed anyway - the final signup will catch it
                setStep(3);
            } finally {
                setCheckingEmail(false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && mode === "signup" && step < 3) {
            e.preventDefault();
            handleNextStep();
        }
    };

    const switchToSignIn = () => {
        setMode("signin");
        setStep(1);
        setError(null);
    };

    const switchToSignUp = () => {
        setMode("signup");
        setStep(1);
        setError(null);
    };



    // Sign In Form
    if (mode === "signin") {
        return (
            <div className="w-full max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-3xl md:text-4xl font-display tracking-tight text-white mb-3">
                        Welcome back
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Sign in to continue your journey
                    </p>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                >
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="arthur@galaxy.guide"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all duration-300"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all duration-300"
                            required
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 mt-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-glow-cyan"
                    >
                        {loading ? (
                            <GridLoader size={28} color="#000000ff" pattern="spiral" glow={true} />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </motion.form>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mt-8 text-center text-sm text-zinc-600"
                >
                    Don&apos;t have an account?{" "}
                    <button
                        onClick={switchToSignUp}
                        className="text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
                    >
                        Sign up
                    </button>
                </motion.p>
            </div>
        );
    }

    // Sign Up Flow - Minimal conversational style
    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header - changes based on step */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-display tracking-tight text-white mb-3">
                        {step === 1 && <>Join the <span className="shimmer-text">galaxy</span></>}
                        {step === 2 && <>Nice to meet you, <span className="shimmer-text">{name}</span></>}
                        {step === 3 && <>Almost there</>}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {step === 1 && "What's your name?"}
                        {step === 2 && "Where can we reach you?"}
                        {step === 3 && "Set a password to secure your account"}
                    </p>
                </motion.div>
            </AnimatePresence>

            {/* Minimal step indicator */}
            <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`h-1 rounded-full transition-all duration-500 ${s === step
                            ? "w-8 bg-cyan-500"
                            : s < step
                                ? "w-2 bg-cyan-500/50"
                                : "w-2 bg-white/10"
                            }`}
                    />
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
                >
                    {error}
                    {error.includes("exists") && (
                        <button
                            onClick={switchToSignIn}
                            className="block mx-auto mt-2 text-cyan-500 hover:text-cyan-400 font-medium"
                        >
                            Sign in instead →
                        </button>
                    )}
                </motion.div>
            )}

            {/* Step Content */}
            <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all duration-300 text-center"
                            />
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!name.trim()}
                                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-glow-cyan"
                            >
                                Continue
                                <ArrowRight className="h-5 w-5" />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all duration-300 text-center"
                            />
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!email.trim() || checkingEmail}
                                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-glow-cyan"
                            >
                                {checkingEmail ? (
                                    <GridLoader size={28} color="#ffffffff" pattern="spiral" glow={true} />
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all duration-300 text-center"
                                    minLength={8}
                                />
                                <p className="text-xs text-zinc-600 mt-3 text-center">At least 8 characters</p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || password.length < 8}
                                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-glow-cyan"
                            >
                                {loading ? (
                                    <GridLoader size={28} color="#000000" pattern="spiral" glow={true} />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10 text-center text-sm text-zinc-600"
            >
                Already have an account?{" "}
                <button
                    onClick={switchToSignIn}
                    className="text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
                >
                    Sign in
                </button>
            </motion.p>
        </div>
    );
}
