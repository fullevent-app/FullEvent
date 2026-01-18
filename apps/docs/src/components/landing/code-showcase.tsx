"use client";

import { motion } from "motion/react";
import { useState, useMemo, Children, isValidElement, type ReactNode } from "react";
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
        if (language === "tsx" || language === "typescript" || language === "ts") {
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
                <span className="w-8 text-right pr-4 text-zinc-600 select-none shrink-0 border-r border-white/5 mr-4">
                    {idx + 1}
                </span>
                <span
                    className="flex-1 font-mono text-sm"
                    dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }}
                />
            </div>
        );
    });
}

// Data Component for defining files in MDX
export function CodeFile({ path, code, language }: { path: string; code: string; language?: string }) {
    return null;
}

interface CodeShowcaseProps {
    children?: ReactNode;
    title?: string;
}

export function CodeShowcase({ children, title = "my-nextjs-app" }: CodeShowcaseProps) {
    // Process children to build file system structure
    const { tree, contentMap, initialFile } = useMemo(() => {
        const items = Children.toArray(children);
        const map: Record<string, { language: string; content: string }> = {};
        const root: ListItem[] = [];
        let firstFile: string | null = null;

        items.forEach((child) => {
            if (!isValidElement(child)) return;
            const { path, code, language } = child.props as { path: string, code: string, language?: string };
            if (!path || !code) return;

            // Add to content map (using basename as key for simplicity in this demo, or full path)
            // For the showcase, we usually click on the leaf name. 
            // Let's use the basename for the ID to match existing logic, 
            // but in a real app we might want unique IDs.
            const parts = path.split('/');
            const filename = parts[parts.length - 1];

            // Guess language from extension if not provided
            let lang = language || 'text';
            if (!language) {
                if (filename.endsWith('.tsx')) lang = 'tsx';
                else if (filename.endsWith('.ts')) lang = 'typescript';
                else if (filename.endsWith('.json')) lang = 'json';
                else if (filename.endsWith('.css')) lang = 'css';
                else if (filename.endsWith('.bash') || filename.endsWith('.sh') || filename.startsWith('.env')) lang = 'bash';
            }

            map[filename] = {
                language: lang,
                content: code.trim()
            };
            if (!firstFile) firstFile = filename;

            // Build tree
            let currentLevel = root;
            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1;
                const existing = currentLevel.find(i => i.label === part);

                if (existing) {
                    if (!isFile) {
                        currentLevel = existing.children!;
                    }
                } else {
                    const newItem: ListItem = {
                        id: isFile ? part : `folder-${part}-${Math.random()}`, // unique ID for folders
                        label: part,
                        icon: isFile ? getFileIcon(part) : <Folder className="h-4 w-4 text-cyan-400" />,
                        children: isFile ? undefined : [],
                    };
                    currentLevel.push(newItem);
                    if (!isFile) {
                        currentLevel = newItem.children!;
                    }
                }
            });
        });

        return { tree: root, contentMap: map, initialFile: firstFile };
    }, [children]);

    const [activeFile, setActiveFile] = useState<string>(initialFile || "");
    const activeContent = contentMap[activeFile];

    const handleFileClick = (item: ListItem) => {
        if (contentMap[item.id]) {
            setActiveFile(item.id);
        }
    };

    if (!activeFile) return null;

    return (
        <div className="rounded-xl border border-white/10 bg-[#0a0a0f] overflow-hidden my-8 not-prose shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                        <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                        <div className="h-3 w-3 rounded-full bg-[#28ca41]" />
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{title}</span>
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
            <div className="flex min-h-[500px]">
                {/* File tree sidebar */}
                <div className="w-56 border-r border-white/5 bg-white/[0.01] py-2 flex-shrink-0">
                    <NativeNestedList
                        items={tree}
                        activeId={activeFile}
                        onItemClick={handleFileClick}
                        size="sm"
                        defaultExpanded={true}
                        showExpandIcon={true}
                        indentSize={12}
                    />
                </div>

                {/* Code viewer */}
                <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                    {/* File tab */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
                        {getFileIcon(activeFile)}
                        <span className="text-xs font-mono text-zinc-300">{activeFile}</span>
                    </div>

                    {/* Code content */}
                    <div className="flex-1 p-4 overflow-auto">
                        <pre className="whitespace-pre font-mono text-[13px] leading-relaxed text-zinc-300">
                            {activeContent && highlightCode(activeContent.content, activeContent.language)}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                    <span>TypeScript • Next.js 14</span>
                    <span className="text-zinc-500">Dynamic Code Showcase</span>
                </div>
            </div>
        </div>
    );
}
