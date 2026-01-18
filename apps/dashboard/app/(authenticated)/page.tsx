"use client";

import { useEffect, useState } from "react";
import { createProject, getProjects, getSubscriptionDetails } from "@/app/actions/projects";
import { useFullevent } from "@fullevent/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { UsageStats } from "@/components/usage-stats";

interface Project {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { createEvent } = useFullevent();
    const [subscription, setSubscription] = useState<{ count: number, max: number } | null>(null);

    useEffect(() => {
        loadProjects();
        loadSubscription();
    }, []);

    const loadSubscription = async () => {
        try {
            const data = await getSubscriptionDetails();
            setSubscription({
                count: data.projectCount,
                max: data.limits.maxProjects
            });
        } catch (e) {
            const event = createEvent("dashboard.subscription_load_failed");
            const error = e instanceof Error ? e : { message: String(e) };
            event.setError(error);
            await event.emit();
        }
    }

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch {
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        setCreating(true);

        const event = createEvent("dashboard.project_create");
        event.set("project_name", newProjectName);

        try {
            const result = await createProject(newProjectName, event.getTraceId());

            if ('error' in result) {
                toast.error(result.error);
                return;
            }

            event.setStatus(200);

            setNewProjectName("");
            loadProjects();
            loadSubscription(); // Reload limits
            toast.success("Project created");
        } catch (error: unknown) {
            event.setError(error as Error);
            toast.error("Failed to create project");
        } finally {
            await event.emit();
            setCreating(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Projects</h1>
            </div>

            <UsageStats />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Create New Project</CardTitle>
                        {subscription && (
                            <span className={subscription.count >= subscription.max ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
                                {subscription.count} / {subscription.max === 999 ? '∞' : subscription.max} projects used
                            </span>
                        )}
                    </div>
                    <CardDescription>Give your project a name to get started.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Input
                        placeholder="Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={handleCreateProject} disabled={creating || (subscription ? subscription.count >= subscription.max : false)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {creating ? "Creating..." : "Create Project"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>Manage your projects and their API keys.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading projects...</p>
                    ) : projects.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No projects found. Create one above.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Project ID</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">{project.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{project.id}</TableCell>
                                        <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/projects/${project.id}/settings`}>
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    Settings
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/logs/${project.id}`}>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Logs
                                                </Link>
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
