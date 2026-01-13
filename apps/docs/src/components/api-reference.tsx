'use client';

import * as Primitive from '@radix-ui/react-accordion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { cn } from '../lib/cn';

// ============================================================================
// API Reference Root
// ============================================================================

interface APIReferenceProps {
    children: ReactNode;
    className?: string;
}

export function APIReference({ children, className }: APIReferenceProps) {
    return (
        <Primitive.Root
            type="single"
            collapsible
            className={cn('space-y-2', className)}
        >
            {children}
        </Primitive.Root>
    );
}

// ============================================================================
// API Method Entry
// ============================================================================

interface APIMethodProps {
    name: string;
    category?: string;
    children: ReactNode;
}

export function APIMethod({ name, category, children }: APIMethodProps) {
    return (
        <Primitive.Item
            value={name}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
        >
            <Primitive.Header className="flex">
                <Primitive.Trigger className="group flex flex-1 items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors">
                    <code className="text-sm font-mono text-zinc-100">{name}</code>
                    <div className="flex items-center gap-3">
                        {category && (
                            <span className="text-xs text-zinc-500 font-medium">{category}</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    </div>
                </Primitive.Trigger>
            </Primitive.Header>
            <Primitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="border-t border-zinc-800">
                    {children}
                </div>
            </Primitive.Content>
        </Primitive.Item>
    );
}

// ============================================================================
// API Method Content (Two Column Layout)
// ============================================================================

interface APIMethodContentProps {
    children: ReactNode;
}

export function APIMethodContent({ children }: APIMethodContentProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
            {children}
        </div>
    );
}

// ============================================================================
// Left Column (Description, Parameters, Returns)
// ============================================================================

interface APIMethodLeftProps {
    children: ReactNode;
}

export function APIMethodLeft({ children }: APIMethodLeftProps) {
    return <div className="p-5 space-y-5">{children}</div>;
}

// ============================================================================
// Right Column (Signature, Examples)
// ============================================================================

interface APIMethodRightProps {
    children: ReactNode;
}

export function APIMethodRight({ children }: APIMethodRightProps) {
    return <div className="p-5 space-y-5 bg-zinc-950/50">{children}</div>;
}

// ============================================================================
// Description
// ============================================================================

interface APIDescriptionProps {
    children: ReactNode;
    note?: string;
}

export function APIDescription({ children, note }: APIDescriptionProps) {
    return (
        <div className="space-y-3">
            <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
            {note && (
                <div className="text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-300">Note:</span> {note}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Parameters Section
// ============================================================================

interface APIParametersProps {
    children: ReactNode;
}

export function APIParameters({ children }: APIParametersProps) {
    return (
        <div className="space-y-3">
            <h4 className="text-base font-semibold text-zinc-100">Parameters</h4>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

// ============================================================================
// Parameter Item
// ============================================================================

interface APIParamProps {
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    children?: ReactNode;
    properties?: ReactNode;
}

export function APIParam({ name, type, required = false, defaultValue, children, properties }: APIParamProps) {
    const [showProperties, setShowProperties] = useState(false);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-semibold text-zinc-100">{name}</code>
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-700 text-zinc-300">
                    {type}
                </span>
                {required && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-900/50 text-red-400">
                        required
                    </span>
                )}
                {defaultValue && (
                    <span className="text-xs text-zinc-500">
                        Default: <code className="text-zinc-400">{defaultValue}</code>
                    </span>
                )}
            </div>
            {children && (
                <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
            )}
            {properties && (
                <div className="mt-2">
                    <button
                        onClick={() => setShowProperties(!showProperties)}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <ChevronDown
                            className={cn(
                                'h-4 w-4 transition-transform duration-200',
                                showProperties && 'rotate-180'
                            )}
                        />
                        {showProperties ? 'Hide' : 'Show'} Properties
                    </button>
                    {showProperties && (
                        <div className="mt-3 pl-4 border-l-2 border-zinc-700 space-y-3">
                            {properties}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Returns Section
// ============================================================================

interface APIReturnsProps {
    type: string;
    children?: ReactNode;
}

export function APIReturns({ type, children }: APIReturnsProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-base font-semibold text-zinc-100">Returns</h4>
            <div className="flex items-start gap-2">
                <code className="text-sm font-mono text-cyan-400">{type}</code>
                {children && <span className="text-sm text-zinc-400">: {children}</span>}
            </div>
        </div>
    );
}

// ============================================================================
// Signature Block
// ============================================================================

interface APISignatureProps {
    children: string;
}

export function APISignature({ children }: APISignatureProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-400">Signature</h4>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 overflow-x-auto">
                <pre className="text-sm font-mono">
                    <code>{children}</code>
                </pre>
            </div>
        </div>
    );
}

// ============================================================================
// Examples Block
// ============================================================================

interface APIExamplesProps {
    children: ReactNode;
}

export function APIExamples({ children }: APIExamplesProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-400">Examples</h4>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 overflow-x-auto">
                <pre className="text-sm font-mono">
                    <code>{children}</code>
                </pre>
            </div>
        </div>
    );
}

// ============================================================================
// Property Item (for nested properties)
// ============================================================================

interface APIPropertyProps {
    name: string;
    type: string;
    required?: boolean;
    children?: ReactNode;
}

export function APIProperty({ name, type, required = false, children }: APIPropertyProps) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono font-medium text-zinc-200">{name}</code>
                <span className="px-1 py-0.5 text-[9px] font-medium rounded bg-zinc-800 text-zinc-400">
                    {type}
                </span>
                {required && (
                    <span className="px-1 py-0.5 text-[9px] font-medium rounded bg-red-900/50 text-red-400">
                        required
                    </span>
                )}
            </div>
            {children && (
                <p className="text-xs text-zinc-500 leading-relaxed">{children}</p>
            )}
        </div>
    );
}

