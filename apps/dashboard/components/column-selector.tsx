"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Columns, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ColumnDefinition = {
    key: string;
    label: string;
    required?: boolean; // If true, cannot be disabled (e.g. Timestamp, or Payload if mandatory)
};

interface ColumnSelectorProps {
    allColumns: string[]; // List of all available potential keys (from suggestions)
    selectedColumns: string[]; // Currently active columns
    onSelectionChange: (columns: string[]) => void;
    defaultColumns: string[]; // Minimal set
}

export function ColumnSelector({
    allColumns,
    selectedColumns,
    onSelectionChange,
    defaultColumns
}: ColumnSelectorProps) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Merge standard columns with discovered keys
    // We define a standard set of "Core" columns that are always available choices
    const coreColumns = [
        { key: "timestamp", label: "Timestamp", required: true },
        { key: "status_code", label: "Status" },
        { key: "method", label: "Method" },
        { key: "path", label: "Path" },
        { key: "duration_ms", label: "Duration" },
        { key: "environment", label: "Env" },
        { key: "payload", label: "Payload" }, // Although "Payload" is a special preview column
    ];

    // Identify "custom" columns - those in allColumns but not in coreColumns
    const customColumns = allColumns
        .filter(key => !coreColumns.some(c => c.key === key))
        .sort();

    // Group columns by prefix (e.g. "cart.count", "cart.total" -> "cart")
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];

    customColumns.forEach(key => {
        const parts = key.split('.');
        if (parts.length > 1) {
            const groupName = parts[0];
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(key);
        } else {
            ungrouped.push(key);
        }
    });

    const toggleColumn = (key: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedColumns, key]);
        } else {
            onSelectionChange(selectedColumns.filter(c => c !== key));
        }
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const toggleAllInGroup = (groupName: string, keys: string[], checked: boolean) => {
        const currentSet = new Set(selectedColumns);
        if (checked) {
            keys.forEach(k => currentSet.add(k));
        } else {
            keys.forEach(k => currentSet.delete(k));
        }
        onSelectionChange(Array.from(currentSet));
    };

    return (
        <Sheet modal={false}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Columns className="mr-2 h-4 w-4" />
                    Columns
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Customize Columns</SheetTitle>
                    <SheetDescription>
                        Select the columns you want to display in the logs table.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6 h-full flex flex-col gap-6">
                    <ScrollArea className="h-full px-4">
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-4 text-sm font-medium text-muted-foreground">Standard Columns</h3>
                                <div className="space-y-3">
                                    {coreColumns.map((col) => {
                                        const isChecked = selectedColumns.includes(col.key);
                                        return (
                                            <div key={col.key} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`col-${col.key}`}
                                                    checked={isChecked}
                                                    disabled={col.required}
                                                    onCheckedChange={(checked) => toggleColumn(col.key, !!checked)}
                                                />
                                                <Label
                                                    htmlFor={`col-${col.key}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {col.label}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {customColumns.length > 0 && (
                                <div>
                                    <h3 className="mb-4 text-sm font-medium text-muted-foreground flex items-center justify-between">
                                        <span>Discovered Properties</span>
                                        <Badge variant="secondary">{customColumns.length}</Badge>
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Render groups */}
                                        {Object.entries(groups).map(([groupName, keys]) => {
                                            const isExpanded = expandedGroups[groupName];
                                            const allChecked = keys.every(k => selectedColumns.includes(k));
                                            const someChecked = keys.some(k => selectedColumns.includes(k));

                                            // Sort keys within group
                                            keys.sort();

                                            return (
                                                <div key={groupName} className="border rounded-md p-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => toggleGroup(groupName)}
                                                            >
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </Button>
                                                            <span className="text-sm font-medium">{groupName}</span>
                                                            <Badge variant="outline" className="text-xs">{keys.length}</Badge>
                                                        </div>
                                                        <Checkbox
                                                            checked={allChecked ? true : (someChecked ? "indeterminate" : false)}
                                                            onCheckedChange={(checked) => toggleAllInGroup(groupName, keys, !!checked)}
                                                        />
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="ml-8 mt-2 space-y-2 border-l pl-4">
                                                            {keys.map(key => {
                                                                const isChecked = selectedColumns.includes(key);
                                                                // Display only the suffix if predictable
                                                                const displayLabel = key.replace(`${groupName}.`, '');

                                                                return (
                                                                    <div key={key} className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`col-${key}`}
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => toggleColumn(key, !!checked)}
                                                                        />
                                                                        <Label
                                                                            htmlFor={`col-${key}`}
                                                                            className="text-sm font-medium leading-none font-mono truncate"
                                                                            title={key}
                                                                        >
                                                                            {displayLabel}
                                                                        </Label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Render ungrouped items */}
                                        {ungrouped.length > 0 && (
                                            <div className="space-y-3 pt-2">
                                                {ungrouped.map((key) => {
                                                    const isChecked = selectedColumns.includes(key);
                                                    return (
                                                        <div key={key} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`col-${key}`}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => toggleColumn(key, !!checked)}
                                                            />
                                                            <Label
                                                                htmlFor={`col-${key}`}
                                                                className="text-sm font-medium leading-none font-mono"
                                                            >
                                                                {key}
                                                            </Label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="pt-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground hover:text-foreground"
                            onClick={() => onSelectionChange(defaultColumns)}
                        >
                            Reset to Default
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet >
    );
}
