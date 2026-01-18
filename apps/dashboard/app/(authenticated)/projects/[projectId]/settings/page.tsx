"use client";

import { use, useEffect, useState } from "react";
import { ApiKeysCard } from "@/components/api-keys-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteProject, getProject } from "@/app/actions/projects";
import { LogLineLogo } from "@/components/ui/logo";

interface Project {
    id: string;
    name: string;
}

interface PageProps {
    params: Promise<{ projectId: string }>;
}

export default function ProjectSettingsPage({ params }: PageProps) {
    const { projectId } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // Delete state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        getProject(projectId).then(p => {
            if (p) setProject(p);
            else {
                toast.error("Project not found");
                router.push("/dashboard");
            }
            setLoading(false);
        }).catch(() => {
            toast.error("Failed to load project");
            setLoading(false);
        });
    }, [projectId, router]);

    const handleDeleteProject = async () => {
        if (!project) return;
        if (deleteConfirmation !== project.name) return;

        setIsDeleting(true);
        try {
            await deleteProject(project.id, deleteConfirmation);
            toast.success("Project scheduled for deletion");
            router.push("/dashboard");
        } catch (error) {
            toast.error("Failed to delete project: " + (error instanceof Error ? error.message : String(error)));
            setIsDeleting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <LogLineLogo size={48} animated={true} variant="stream" autoPlay={true} />
        </div>
    );
    if (!project) return null;

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

            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible and destructive actions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center bg-destructive/5 p-4 rounded-lg border border-destructive/10">
                        <div>
                            <h3 className="font-medium text-destructive">Delete Project</h3>
                            <p className="text-sm text-muted-foreground text-destructive/80">
                                Permanently remove this project and all its data.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                        >
                            Delete Project
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the project <strong>{project.name}</strong>.
                            <br /><br />
                            Note: Project data will be retained for 7 days before permanent deletion.
                            <strong> Monthly event counts will NOT be reset.</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-name">
                                Type <strong>{project.name}</strong> to confirm.
                            </Label>
                            <Input
                                id="confirm-name"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="Project Name"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteProject}
                            disabled={deleteConfirmation !== project.name || isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
