"use client";

import { useState } from "react";
import AuthForm from "@/components/auth-form";
import { AuthEventDemo } from "@/components/login/auth-event-demo";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>("signin");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");

    return (
        <div className="min-h-screen flex dark">
            {/* Left Panel - Code Demo */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#050507] relative overflow-hidden items-center justify-center">
                <div className="w-full max-w-xl px-12">
                    <AuthEventDemo mode={mode} />
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full lg:w-1/2 bg-[#050507] flex items-center justify-center p-8">
                <AuthForm
                    mode={mode}
                    setMode={setMode}
                    email={email}
                    setEmail={setEmail}
                    name={name}
                    setName={setName}
                />
            </div>
        </div>
    );
}
