"use client";

import { use } from "react";
import { ApiKeysCard } from "@/components/api-keys-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
    params: Promise<{ projectId: string }>;
}

export default function ProjectSettingsPage({ params }: PageProps) {
    const { projectId } = use(params);

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-8">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Project Settings</h1>
                    <p className="text-muted-foreground text-sm">Project ID: <span className="font-mono">{projectId}</span></p>
                </div>
            </div>

            <ApiKeysCard projectId={projectId} />
        </div>
    );
}
