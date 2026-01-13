"use client";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AuthEventDemoProps {
    mode: "signin" | "signup";
}

const signupCode = `import { useFullevent } from "@fullevent/react";

function SignUpForm() {
  const { createEvent } = useFullevent();

  const handleSignUp = async (email, name) => {
    const event = createEvent("auth.signup");
    event.set("email", email);
    event.set("name", name);

    try {
      await authClient.signUp({ email, name });
      event.emit(); // Success - event sent
    } catch (error) {
      event.setError(error);
      event.emit(); // Error captured with context
    }
  };
}`;

const signinCode = `import { useFullevent } from "@fullevent/react";

function SignInForm() {
  const { createEvent } = useFullevent();

  const handleSignIn = async (email) => {
    const event = createEvent("auth.signin");
    event.set("email", email);

    try {
      await authClient.signIn({ email });
      event.emit(); // Success - event sent
    } catch (error) {
      event.setError(error);
      event.emit(); // Error captured with context
    }
  };
}`;

export function AuthEventDemo({ mode }: AuthEventDemoProps) {
    const code = mode === "signup" ? signupCode : signinCode;
    const fileName = mode === "signup" ? "signup.tsx" : "signin.tsx";

    // Custom style - transparent background
    const customStyle = {
        ...vscDarkPlus,
        'pre[class*="language-"]': {
            ...vscDarkPlus['pre[class*="language-"]'],
            background: 'transparent',
            margin: 0,
            padding: 0,
            fontSize: '13px',
            lineHeight: '1.7',
        },
        'code[class*="language-"]': {
            ...vscDarkPlus['code[class*="language-"]'],
            fontSize: '13px',
        }
    };

    return (
        <div className="w-full">
            {/* VS Code-like window */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/30">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <span className="text-xs text-zinc-500 font-mono">{fileName}</span>
                    </div>
                    <div className="w-[54px]" /> {/* Spacer for centering */}
                </div>

                {/* Code content */}
                <div className="p-4 font-mono overflow-x-auto">
                    <SyntaxHighlighter
                        language="typescript"
                        style={customStyle}
                        showLineNumbers={true}
                        lineNumberStyle={{
                            color: '#4a4a4a',
                            fontSize: '12px',
                            paddingRight: '16px',
                            minWidth: '2em',
                        }}
                        wrapLongLines={false}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}
