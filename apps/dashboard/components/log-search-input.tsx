"use client";

import * as React from "react";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogSearchInputProps {
    onSearch: (query: string, parsed: ParsedQuery) => void;
    isLoading?: boolean;
    /** Dynamic suggestions derived from user's actual log data */
    dynamicSuggestions?: SearchSuggestions;
}

export interface ParsedQuery {
    search: string;
    [key: string]: string | undefined;
}

export interface SearchSuggestions {
    /** Event types from the type column */
    eventTypes: string[];
    /** All fields discovered from ingested_properties: key -> values */
    fields: Record<string, string[]>;
}

interface FilterChip {
    key: string;
    value: string;
}

export function LogSearchInput({ onSearch, isLoading, dynamicSuggestions }: LogSearchInputProps) {
    // Completed filters as chips
    const [filters, setFilters] = React.useState<FilterChip[]>([]);
    // Current input text (could be "status:" or "status:200" or just "search text")
    const [inputValue, setInputValue] = React.useState("");
    // Current key being typed (e.g., "status" when user typed "status:")
    const [activeKey, setActiveKey] = React.useState<string | null>(null);
    const [open, setOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Build filter keys from actual data
    const availableKeys = React.useMemo((): string[] => {
        if (!dynamicSuggestions) return [];

        const keys: string[] = [];

        if (dynamicSuggestions.eventTypes.length > 0) {
            keys.push("type");
        }

        Object.keys(dynamicSuggestions.fields).forEach(field => {
            keys.push(field);
        });

        return keys.sort();
    }, [dynamicSuggestions]);

    // Get values for a specific key
    const getValuesForKey = React.useCallback((key: string): string[] => {
        if (!dynamicSuggestions) return [];

        if (key === "type") {
            return dynamicSuggestions.eventTypes;
        }

        return dynamicSuggestions.fields[key] || [];
    }, [dynamicSuggestions]);

    // Current suggestions based on state
    const currentSuggestions = React.useMemo((): string[] => {
        // If we have an active key, suggest values
        if (activeKey) {
            const vals = getValuesForKey(activeKey);
            const currentTyped = inputValue.toLowerCase();

            if (currentTyped) {
                return vals.filter((v: string) => v.toLowerCase().includes(currentTyped));
            }
            return vals;
        }

        // Otherwise suggest keys
        const typed = inputValue.toLowerCase();
        if (typed) {
            return availableKeys.filter((k: string) => k.toLowerCase().startsWith(typed));
        }

        return availableKeys;
    }, [inputValue, activeKey, getValuesForKey, availableKeys]);

    // Trigger search when filters change (only complete filters)
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            const parsed: ParsedQuery = { search: "" };

            // Add completed filters
            filters.forEach(f => {
                parsed[f.key] = f.value;
            });

            // If there's plain text (no active key), use as search
            if (!activeKey && inputValue.trim()) {
                parsed.search = inputValue.trim();
            }

            // Build query string for display
            const queryParts = filters.map(f => `${f.key}:${f.value}`);
            if (!activeKey && inputValue.trim()) {
                queryParts.push(inputValue.trim());
            }

            onSearch(queryParts.join(" "), parsed);
        }, 300);

        return () => clearTimeout(timeout);
    }, [filters, inputValue, activeKey, onSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setOpen(true);
        setSelectedIndex(-1); // Reset selection on input change
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === "Backspace") {
            if (inputValue === "" && activeKey) {
                // Remove active key
                setActiveKey(null);
                e.preventDefault();
            } else if (inputValue === "" && !activeKey && filters.length > 0) {
                // Remove last filter's value first, then key on next backspace
                const lastFilter = filters[filters.length - 1];
                // Put the key back as active so user can re-type value
                setActiveKey(lastFilter.key);
                setFilters(prev => prev.slice(0, -1));
                e.preventDefault();
            }
        }

        // Handle colon - activates key mode
        if (e.key === ":" && !activeKey && inputValue.trim()) {
            const potentialKey = inputValue.trim().toLowerCase();
            if (availableKeys.includes(potentialKey)) {
                setActiveKey(potentialKey);
                setInputValue("");
                setOpen(true);
                e.preventDefault();
            }
        }

        // Handle Enter - complete the current filter
        if (e.key === "Enter") {
            // Priority 1: Select highlighted suggestion
            if (open && selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                selectSuggestion(currentSuggestions[selectedIndex]);
                e.preventDefault();
                return;
            }

            // Priority 2: Complete filter with typed value if active key
            if (activeKey && inputValue.trim()) {
                // Complete the filter
                setFilters(prev => [...prev, { key: activeKey, value: inputValue.trim() }]);
                setActiveKey(null);
                setInputValue("");
                setOpen(false);
                setSelectedIndex(-1);
            }
            // Priority 3: Default Enter behavior (form submit / search) - fallback handled by effect
            // But we prevent default if we have a partial filter to avoid confusion
            if (activeKey) {
                e.preventDefault();
            }
        }

        // Handle Arrows
        if (e.key === "ArrowDown") {
            if (!open) {
                setOpen(true);
                setSelectedIndex(0);
            } else {
                setSelectedIndex(prev => (prev < currentSuggestions.length - 1 ? prev + 1 : prev));
            }
            e.preventDefault();
        }

        if (e.key === "ArrowUp") {
            if (open) {
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
            e.preventDefault();
        }

        // Handle Escape - cancel active key
        if (e.key === "Escape") {
            if (activeKey) {
                setActiveKey(null);
                setInputValue("");
            }
            setOpen(false);
            setSelectedIndex(-1);
        }
    };

    const selectSuggestion = (suggestion: string) => {
        if (activeKey) {
            // Adding a value - complete the filter
            setFilters(prev => [...prev, { key: activeKey, value: suggestion }]);
            setActiveKey(null);
            setInputValue("");
            setOpen(false);
        } else {
            // Adding a key - activate it
            setActiveKey(suggestion);
            setInputValue("");
            // Adding a key - activate it
            setActiveKey(suggestion);
            setInputValue("");
            setOpen(true);
        }
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const removeFilter = (index: number) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
        inputRef.current?.focus();
    };

    const clearAll = () => {
        setFilters([]);
        setActiveKey(null);
        setInputValue("");
        inputRef.current?.focus();
    };

    const hasSuggestions = dynamicSuggestions && (
        dynamicSuggestions.eventTypes.length > 0 ||
        Object.keys(dynamicSuggestions.fields).length > 0
    );

    const hasContent = filters.length > 0 || activeKey || inputValue;

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl">
            <div className={cn(
                "flex items-center gap-1.5 w-full bg-zinc-950/50 border border-zinc-800 px-3 py-2 min-h-[42px] focus-within:ring-1 focus-within:ring-zinc-700 transition-all",
                isLoading && "opacity-80"
            )}>
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />

                {/* Render filter chips */}
                {filters.map((filter, idx) => (
                    <div
                        key={`${filter.key}-${idx}`}
                        className="flex items-center gap-0.5 bg-zinc-800 px-2 py-0.5 text-sm shrink-0"
                    >
                        <span className="text-zinc-400">{filter.key}:</span>
                        <span className="text-zinc-100">{filter.value}</span>
                        <button
                            onClick={() => removeFilter(idx)}
                            className="ml-1 hover:text-red-400 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {/* Active key chip (incomplete - waiting for value) */}
                {activeKey && (
                    <div className="flex items-center bg-zinc-800 px-2 py-0.5 text-sm shrink-0">
                        <span className="text-zinc-400">{activeKey}:</span>
                    </div>
                )}

                {/* Input field */}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setOpen(true)}
                    placeholder={
                        filters.length === 0 && !activeKey
                            ? (hasSuggestions ? "Type a filter or search..." : "Search logs...")
                            : activeKey
                                ? "Type value..."
                                : "Add filter..."
                    }
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-zinc-600"
                />

                {/* Clear all button */}
                {hasContent && (
                    <button
                        onClick={clearAll}
                        className="p-1 hover:bg-zinc-800 rounded-none shrink-0"
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Suggestions Popover */}
            {currentSuggestions.length > 0 && open && (
                <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-zinc-900/50 border-b border-zinc-800 sticky top-0">
                        {activeKey ? `Select ${activeKey} value` : "Available filters"}
                    </p>
                    {currentSuggestions.map((s, idx) => (
                        <button
                            key={s}
                            onClick={() => selectSuggestion(s)}
                            onMouseEnter={() => setSelectedIndex(idx)} // Mouse sync
                            className={cn(
                                "flex items-center w-full px-3 py-2 text-sm text-left transition-colors border-l-2",
                                idx === selectedIndex
                                    ? "bg-zinc-800 border-zinc-600 outline-none"
                                    : "hover:bg-zinc-800 border-transparent hover:border-zinc-600"
                            )}
                        >
                            {activeKey ? (
                                <span className="font-medium text-blue-400">{s}</span>
                            ) : (
                                <>
                                    <Filter className="mr-2 h-3.5 w-3.5 opacity-70" />
                                    <span>{s}:</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
