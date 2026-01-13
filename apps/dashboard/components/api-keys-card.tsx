"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { getProjectKeys, createProjectKey, revokeProjectKey } from "@/app/actions/projects";

import { useFullevent } from "@fullevent/react";
import { authClient } from "@/lib/auth-client";

// Key type for display purposes
type ProjectKey = {
    id: string;
    name: string | null;
    start: string | null;
    createdAt: Date;
};

interface ProjectSettingsProps {
    projectId: string;
}

export function ApiKeysCard({ projectId }: ProjectSettingsProps) {
    const [keys, setKeys] = useState<ProjectKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const { capture } = useFullevent();
    const { data: session } = authClient.useSession();

    useEffect(() => {
        loadKeys();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const loadKeys = async () => {
        try {
            const data = await getProjectKeys(projectId);
            setKeys(data);
        } catch {
            toast.error("Failed to load API keys");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        setCreating(true);
        setNewKey(null);
        try {
            const res = await createProjectKey(projectId);
            if (res.key) {
                setNewKey(res.key);
                loadKeys();
                toast.success("API Key created");
                capture('api_key_created', {
                    projectId,
                    keyId: res.id,
                    user: {
                        id: session?.user?.id,
                        email: session?.user?.email,
                        name: session?.user?.name
                    }
                });
            }
        } catch {
            toast.error("Failed to create keys");
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm("Are you sure you want to revoke this key? This action cannot be undone.")) return;

        try {
            await revokeProjectKey(keyId, projectId);
            loadKeys();
            toast.success("API Key revoked");
            capture('api_key_revoked', {
                projectId,
                keyId,
                user: {
                    id: session?.user?.id,
                    email: session?.user?.email,
                    name: session?.user?.name
                }
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to revoke key";
            toast.error(message);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>Manage the API keys used to send events to this project.</CardDescription>
                    </div>
                    <Button onClick={handleCreateKey} disabled={creating}>
                        <Plus className="mr-2 h-4 w-4" />
                        {creating ? "Creating..." : "Create New Key"}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {newKey && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md space-y-2">
                            <p className="text-sm font-medium text-emerald-500">New API Key Generated</p>
                            <p className="text-xs text-muted-foreground">This is the only time you will see this key. Copy it now.</p>
                            <div className="flex items-center gap-2">
                                <Input value={newKey} readOnly className="font-mono bg-background" />
                                <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading keys...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Key Prefix</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{key.start}...</TableCell>
                                        <TableCell className="text-xs">{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRevokeKey(key.id)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                disabled={keys.length <= 1}
                                                title={keys.length <= 1 ? "Cannot revoke the last key" : "Revoke key"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
