"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
    code: string;
    language?: string;
    fileName?: string;
    showLineNumbers?: boolean;
    className?: string;
}

export function CodeBlock({ code, language = "typescript", fileName, showLineNumbers = false, className = "" }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const lines = code.split("\n");

    return (
        <div className={`relative group rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden ${className}`}>
            {/* Header with filename and actions */}
            {(fileName || language) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        {fileName && (
                            <span className="text-xs text-zinc-400 font-medium">
                                {fileName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {language && !fileName && (
                            <span className="text-xs text-zinc-500 font-mono">
                                {language}
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Copy button (floating if no header) */}
            {!fileName && !language && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/50 hover:bg-zinc-700"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                        <Copy className="h-4 w-4 text-zinc-400" />
                    )}
                </Button>
            )}

            {/* Code content */}
            <pre className={`p-4 overflow-x-auto text-sm font-mono text-zinc-300 ${!fileName && "pt-8"}`}>
                <code>
                    {lines.map((line, i) => (
                        <div key={i} className="leading-relaxed">
                            {showLineNumbers && (
                                <span className="inline-block w-8 text-zinc-600 select-none text-right mr-4">
                                    {i + 1}
                                </span>
                            )}
                            <span className="whitespace-pre">{highlightSyntax(line, language)}</span>
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
}

// Simple syntax highlighting for common patterns
function highlightSyntax(line: string, _language: string): React.ReactNode {
    // Keywords (removed 'class' to handle separately)
    const keywords = ["import", "export", "from", "const", "let", "var", "function", "async", "await", "return", "if", "else", "new", "interface", "type", "extends", "implements"];

    // Split into tokens and highlight
    let result = line;

    // Highlight strings (both single and double quotes)
    result = result.replace(/(["'`])([^"'`]*)\1/g, '<span class="text-emerald-400">$1$2$1</span>');

    // Highlight comments
    if (result.includes("//")) {
        const commentIndex = result.indexOf("//");
        const beforeComment = result.slice(0, commentIndex);
        const comment = result.slice(commentIndex);
        result = beforeComment + `<span class="text-zinc-500 italic">${comment}</span>`;
    }

    // Highlight keywords
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, "g");
        result = result.replace(regex, '<span class="text-cyan-400">$1</span>');
    });

    // Special handling for 'class' keyword to avoid matching HTML attributes
    // Matches 'class' only when NOT followed by '=' (ignoring whitespace)
    result = result.replace(/\b(class)\b(?!\s*=)/g, '<span class="text-cyan-400">$1</span>');

    // Highlight function calls
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="text-yellow-400">$1</span>(');

    // Render with dangerouslySetInnerHTML for the highlighting
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
}
