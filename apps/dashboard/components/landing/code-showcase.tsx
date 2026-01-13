"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { NativeNestedList, type ListItem } from "./file-tree";
import { FileCode2, Folder, FileJson, FileText, File } from "lucide-react";

// File icon helper
function getFileIcon(filename: string) {
    if (filename.endsWith(".tsx") || filename.endsWith(".ts")) {
        return <FileCode2 className="h-4 w-4 text-blue-400" />;
    }
    if (filename.endsWith(".json")) {
        return <FileJson className="h-4 w-4 text-yellow-400" />;
    }
    if (filename.endsWith(".md")) {
        return <FileText className="h-4 w-4 text-zinc-400" />;
    }
    if (filename.endsWith(".css")) {
        return <FileCode2 className="h-4 w-4 text-pink-400" />;
    }
    if (filename.endsWith(".env") || filename.endsWith(".env.local")) {
        return <File className="h-4 w-4 text-green-400" />;
    }
    return <File className="h-4 w-4 text-zinc-500" />;
}

// File contents for the showcase
const fileContents: Record<string, { language: string; content: string }> = {
    "layout.tsx": {
        language: "tsx",
        content: `import { FullEventProvider } from "@fullevent/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FullEventProvider
          apiKey={process.env.NEXT_PUBLIC_FULLEVENT_KEY!}
        >
          {children}
        </FullEventProvider>
      </body>
    </html>
  );
}`,
    },
    "page.tsx": {
        language: "tsx",
        content: `"use client";

import { useFullevent } from "@fullevent/react";

export default function CheckoutPage() {
  const { createEvent } = useFullevent();

  const handleCheckout = async () => {
    // Create a wide event with trace ID
    const event = createEvent("checkout.started");
    event.set("cart_total", 9999);

    // Pass trace ID to backend via headers
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: event.getHeaders(),
      body: JSON.stringify({ items: cart }),
    });

    event.setStatus(res.status);
    await event.emit();
  };

  return <button onClick={handleCheckout}>Pay</button>;
}`,
    },
    "route.ts": {
        language: "typescript",
        content: `import { NextRequest, NextResponse } from "next/server";
import { wideLogger, type WideEvent } from "@fullevent/node";

// Middleware auto-extracts x-fullevent-trace-id
export const POST = wideLogger(async (
  req: NextRequest,
  event: WideEvent
) => {
  const body = await req.json();

  // Same trace_id as frontend! 🎯
  console.log("Trace:", event.trace_id);

  // Enrich with business context
  event.cart = {
    items: body.items.length,
    total_cents: body.total,
  };

  // Add payment timing
  const start = Date.now();
  await processPayment(body);
  event.payment_ms = Date.now() - start;

  return NextResponse.json({ ok: true });
});`,
    },
    ".env.local": {
        language: "bash",
        content: `# FullEvent API Keys
NEXT_PUBLIC_FULLEVENT_KEY=pk_live_xxxxx
FULLEVENT_API_KEY=sk_live_xxxxx

# Your existing env vars
DATABASE_URL="postgresql://..."
STACK_SECRET_SERVER_KEY="..."`,
    },
    "package.json": {
        language: "json",
        content: `{
  "name": "my-nextjs-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "@fullevent/react": "^1.0.0",
    "@fullevent/node": "^1.0.0"
  }
}`,
    },
};

// Next.js project structure
const projectFiles: ListItem[] = [
    {
        id: "app",
        label: "app",
        icon: <Folder className="h-4 w-4 text-cyan-400" />,
        children: [
            {
                id: "layout.tsx",
                label: "layout.tsx",
                icon: getFileIcon("layout.tsx"),
            },
            {
                id: "page.tsx",
                label: "page.tsx",
                icon: getFileIcon("page.tsx"),
            },
            {
                id: "api",
                label: "api",
                icon: <Folder className="h-4 w-4 text-cyan-400" />,
                children: [
                    {
                        id: "checkout",
                        label: "checkout",
                        icon: <Folder className="h-4 w-4 text-cyan-400" />,
                        children: [
                            {
                                id: "route.ts",
                                label: "route.ts",
                                icon: getFileIcon("route.ts"),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: ".env.local",
        label: ".env.local",
        icon: getFileIcon(".env.local"),
    },
    {
        id: "package.json",
        label: "package.json",
        icon: getFileIcon("package.json"),
    },
];

// Escape HTML entities
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Syntax highlighting with proper HTML escaping
function highlightCode(code: string, language: string) {
    const lines = code.split("\n");

    return lines.map((line, idx) => {
        // First escape all HTML
        let highlighted = escapeHtml(line);

        // Apply syntax highlighting based on language
        if (language === "tsx" || language === "typescript") {
            // Comments first (so they don't get broken by other replacements)
            highlighted = highlighted.replace(
                /(\/\/.*$)/g,
                '<span class="text-zinc-500">$1</span>'
            );
            // Strings (double quotes, single quotes, backticks)
            highlighted = highlighted.replace(
                /(&quot;[^&]*&quot;|&#039;[^&]*&#039;|`[^`]*`)/g,
                '<span class="text-emerald-400">$&</span>'
            );
            // Keywords
            highlighted = highlighted.replace(
                /\b(import|export|default|function|const|let|var|return|async|await|from|if|else|new)\b/g,
                '<span class="text-purple-400">$1</span>'
            );
            // JSX/Component tags (capitalized words after < or </)
            highlighted = highlighted.replace(
                /(&lt;\/?)([\w]+)/g,
                (match, bracket, tag) => {
                    // Check if tag starts with uppercase (component)
                    if (tag[0] === tag[0].toUpperCase() && /[A-Z]/.test(tag[0])) {
                        return `${bracket}<span class="text-cyan-400">${tag}</span>`;
                    }
                    // Lowercase tags (html elements)
                    return `${bracket}<span class="text-red-400">${tag}</span>`;
                }
            );
            // Types after colon
            highlighted = highlighted.replace(
                /(:\s*)([A-Z][\w.&;]*)/g,
                '$1<span class="text-yellow-400">$2</span>'
            );
        } else if (language === "json") {
            // JSON keys
            highlighted = highlighted.replace(
                /(&quot;)([\w@/-]+)(&quot;)(:)/g,
                '$1<span class="text-cyan-400">$2</span>$3$4'
            );
            // JSON string values
            highlighted = highlighted.replace(
                /(:\s*)(&quot;)([^&]+)(&quot;)/g,
                '$1$2<span class="text-emerald-400">$3</span>$4'
            );
        } else if (language === "bash") {
            // Skip lines that are just comments
            if (highlighted.trim().startsWith("#")) {
                highlighted = `<span class="text-zinc-500">${highlighted}</span>`;
            } else if (highlighted.includes("=")) {
                // Env var lines: NAME=value
                highlighted = highlighted.replace(
                    /^([A-Z_]+)(=)(.*)$/,
                    '<span class="text-cyan-400">$1</span>$2<span class="text-emerald-400">$3</span>'
                );
            }
        }

        return (
            <div key={idx} className="flex">
                <span className="w-8 text-right pr-4 text-zinc-600 select-none shrink-0">
                    {idx + 1}
                </span>
                <span
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }}
                />
            </div>
        );
    });
}

export function CodeShowcase() {
    const [activeFile, setActiveFile] = useState("layout.tsx");
    const activeContent = fileContents[activeFile];

    const handleFileClick = (item: ListItem) => {
        if (fileContents[item.id]) {
            setActiveFile(item.id);
        }
    };

    return (
        <section className="relative py-32 overflow-hidden">
            <div className="container px-6 mx-auto relative z-10 max-w-5xl">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mb-12 text-center"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-display text-white mb-6 tracking-tight leading-[1.1]">
                        Drop in. Start tracking.
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-400 leading-relaxed font-sans max-w-2xl mx-auto">
                        Add FullEvent to your Next.js project in minutes.
                        Track events from both client and server with zero configuration.
                    </p>
                </motion.div>

                {/* Code Demo Container */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="rounded-2xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                <div className="h-3 w-3 rounded-full bg-[#28ca41]" />
                            </div>
                            <span className="text-xs font-mono text-zinc-500">my-nextjs-app</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                                @fullevent/react
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                                @fullevent/node
                            </span>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex min-h-[400px]">
                        {/* File tree sidebar */}
                        <div className="w-56 border-r border-white/5 bg-white/[0.01] py-2">
                            <NativeNestedList
                                items={projectFiles}
                                activeId={activeFile}
                                onItemClick={handleFileClick}
                                size="sm"
                                defaultExpanded={true}
                                showExpandIcon={true}
                                indentSize={12}
                            />
                        </div>

                        {/* Code viewer */}
                        <div className="flex-1 overflow-hidden">
                            {/* File tab */}
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                                {getFileIcon(activeFile)}
                                <span className="text-xs font-mono text-zinc-300">{activeFile}</span>
                            </div>

                            {/* Code content */}
                            <div className="p-4 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-x-auto">
                                <pre className="whitespace-pre">
                                    {activeContent && highlightCode(activeContent.content, activeContent.language)}
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                            <span>TypeScript • Next.js 14</span>
                            <span className="text-zinc-500">2 dependencies added</span>
                        </div>
                    </div>
                </motion.div>

                {/* Install command */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="mt-8 flex justify-center"
                >
                    <div className="inline-flex items-center gap-3 bg-zinc-900/50 border border-white/[0.08] rounded-lg px-5 py-3">
                        <span className="text-zinc-500 font-mono text-sm">$</span>
                        <code className="text-sm font-mono text-white">
                            npm install @fullevent/react @fullevent/node
                        </code>
                        <button
                            className="text-zinc-500 hover:text-white transition-colors ml-2"
                            onClick={() => navigator.clipboard.writeText("npm install @fullevent/react @fullevent/node")}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
