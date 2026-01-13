"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/ui/code-block";
import { GridLoader } from "@/components/ui/grid-loader";
import {
    createProjectWithKey,
    checkForTestEvent,
    completeOnboarding
} from "@/app/actions/projects";
import {
    Check,
    Copy,
    Rocket,
    Key,
    Terminal,
    Zap,
    X,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface OnboardingData {
    projectId: string | null;
    projectName: string | null;
    apiKey: string | null;
}

type StepStatus = "pending" | "active" | "complete";

interface StepConfig {
    id: number;
    title: string;
    icon: React.ElementType;
}

const stepConfigs: StepConfig[] = [
    { id: 1, title: "Project", icon: Rocket },
    { id: 2, title: "API Key", icon: Key },
    { id: 3, title: "Install", icon: Terminal },
    { id: 4, title: "Connect", icon: Zap },
];

interface PingEvent {
    id: string;
    type: string;
    timestamp: Date;
    payload: Record<string, unknown>;
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [projectName, setProjectName] = useState("");
    const [creating, setCreating] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testSuccess, setTestSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pingEvent, setPingEvent] = useState<PingEvent | null>(null);
    const [data, setData] = useState<OnboardingData>({
        projectId: null,
        projectName: null,
        apiKey: null,
    });

    // Clear API key when leaving step 2
    useEffect(() => {
        if (currentStep !== 2 && data.apiKey) {
            setData(prev => ({ ...prev, apiKey: null }));
        }
    }, [currentStep, data.apiKey]);

    const getStepStatus = (stepId: number): StepStatus => {
        if (stepId < currentStep) return "complete";
        if (stepId === currentStep) return "active";
        return "pending";
    };

    const handleCreateProject = async () => {
        if (!projectName.trim()) return;
        setCreating(true);
        try {
            const result = await createProjectWithKey(projectName);
            setData({
                projectId: result.projectId,
                projectName: result.projectName,
                apiKey: result.apiKey,
            });
            setCurrentStep(2);
            toast.success("Project created!");
        } catch {
            toast.error("Failed to create project");
        } finally {
            setCreating(false);
        }
    };

    const copyApiKey = async () => {
        if (data.apiKey) {
            await navigator.clipboard.writeText(data.apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("API Key copied!");
        }
    };

    const handleTestConnection = useCallback(async () => {
        if (!data.projectId) return;

        setTesting(true);
        let attempts = 0;
        const maxAttempts = 30;

        const poll = async (): Promise<boolean> => {
            try {
                const result = await checkForTestEvent(data.projectId!);
                if (result.hasEvents) {
                    if (result.event) {
                        setPingEvent({
                            ...result.event,
                            payload: typeof result.event.payload === 'string'
                                ? JSON.parse(result.event.payload)
                                : result.event.payload
                        });
                    }
                    return true;
                }
            } catch (error) {
                console.error("Error checking for events:", error);
            }
            return false;
        };

        while (attempts < maxAttempts) {
            const hasEvents = await poll();
            if (hasEvents) {
                setTestSuccess(true);
                setTesting(false);
                toast.success("Connection successful!");
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }

        setTesting(false);
        toast.error("No ping received. Check your configuration and try again.");
    }, [data.projectId]);

    const handleSkip = async () => {
        await completeOnboarding();
        onComplete();
    };

    const installCode = `npm install @fullevent/node-sdk`;

    const initCode = `import { FullEvent } from "@fullevent/node-sdk";
 
 export const fullevent = new FullEvent({
   apiKey: process.env.FULLEVENT_API_KEY,
 });`;

    const pingCode = `// Call this in a route (e.g. app/page.tsx), start your project and visit the page. Come back here to continue.
 await fullevent.ping();`;

    const renderStepContent = (stepId: number) => {
        switch (stepId) {
            case 1:
                return (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-medium text-white">Create a project</h3>
                                <p className="text-xs text-muted-foreground">
                                    Projects organize events from different apps
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                Waiting for project
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="My Awesome App"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="h-9 flex-1 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                                autoFocus
                            />
                            <Button
                                onClick={handleCreateProject}
                                disabled={!projectName.trim() || creating}
                                size="sm"
                                className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                {creating ? (
                                    <GridLoader size={16} color="#ffffff" pattern="spiral" />
                                ) : (
                                    "Create"
                                )}
                            </Button>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-medium text-white">Your API Key</h3>
                                <p className="text-xs text-muted-foreground">
                                    Save this securely — you won&apos;t see it again
                                </p>
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
                                ✓ {data.projectName} created
                            </div>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-medium text-white">Install the SDK</h3>
                                <p className="text-xs text-muted-foreground">
                                    Add FullEvent to your project and run <code className="text-cyan-400">ping()</code>
                                </p>
                            </div>
                        </div>


                        <div className="flex justify-between items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-zinc-400 hover:text-white h-8 px-2"
                                onClick={() => window.open("https://docs.fullevent.io/quickstart", "_blank")}
                            >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Show docs
                            </Button>
                            <Button
                                onClick={() => setCurrentStep(4)}
                                size="sm"
                                className="h-8 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                            >
                                I&apos;ve added the code
                            </Button>
                        </div>
                    </>
                );
            case 4:
                if (testSuccess) {
                    return (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                        <Check className="h-3.5 w-3.5 text-cyan-400" />
                                        Connection successful!
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Ping received. You can now remove the ping code.
                                    </p>
                                </div>
                            </div>

                            {pingEvent && (
                                <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-mono text-zinc-500">Event Payload</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                            {new Date(pingEvent.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <pre className="text-[10px] leading-relaxed font-mono text-zinc-300 overflow-x-auto">
                                        {JSON.stringify(pingEvent.payload, null, 2)}
                                    </pre>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSkip}
                                    size="sm"
                                    className="h-8 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        </>
                    );
                }
                return (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-medium text-white">Test connection</h3>
                                <p className="text-xs text-muted-foreground">
                                    Import your client and run <code className="text-cyan-400">fullevent.ping()</code>
                                </p>
                            </div>
                            {testing && (
                                <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                    Listening...
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {testing ? (
                                <>
                                    <GridLoader
                                        size={24}
                                        color="#22d3ee"
                                        pattern="ripple-out"
                                        glow
                                    />
                                    <p className="text-xs text-zinc-400">
                                        Waiting for ping...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-zinc-400 hover:text-white h-8 px-2"
                                        onClick={handleSkip}
                                    >
                                        Skip for now
                                    </Button>
                                    <Button
                                        onClick={handleTestConnection}
                                        disabled={testing}
                                        size="sm"
                                        className="h-8 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                                    >
                                        Test Connection
                                    </Button>
                                </>
                            )}
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Close button */}
            <div className="absolute top-4 right-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="text-zinc-500 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Header */}
            <div className="pt-12 px-8 text-center">
                <h1 className="text-2xl font-semibold mb-1">Get started with FullEvent</h1>
                <p className="text-sm text-muted-foreground">
                    4 steps to get your events flowing in less than 5 minutes
                </p>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
                <div className="w-full max-w-4xl">
                    {/* Step cards row - compact height */}
                    {/* Step cards row - compact height */}
                    <div className="flex gap-3 h-[120px]">
                        {stepConfigs.map((step) => {
                            const status = getStepStatus(step.id);
                            const isActive = status === "active";
                            const isComplete = status === "complete";
                            const isPending = status === "pending";
                            const StepIcon = step.icon;

                            return (
                                <div
                                    key={step.id}
                                    onClick={() => isComplete && setCurrentStep(step.id)}
                                    className={`
                                        relative rounded-xl border
                                        transition-all duration-300 ease-out
                                        ${isActive
                                            ? "bg-zinc-900 border-zinc-700 flex-[4]"
                                            : isComplete
                                                ? "bg-zinc-900/50 border-zinc-700 cursor-pointer hover:border-zinc-600 flex-1"
                                                : "bg-zinc-900/30 border-zinc-800 opacity-50 flex-1"
                                        }
                                    `}
                                    style={{ cursor: isPending ? "not-allowed" : isComplete ? "pointer" : "default" }}
                                >
                                    {/* Collapsed state (icon + title) */}
                                    <div
                                        className={`
                                            absolute inset-0 flex flex-col items-center justify-center p-4
                                            transition-opacity duration-200
                                            ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"}
                                        `}
                                    >
                                        <div className={`
                                            relative w-10 h-10 rounded-lg flex items-center justify-center mb-2
                                            ${isComplete
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-zinc-800 text-zinc-500"
                                            }
                                        `}>
                                            <StepIcon className="h-5 w-5 shrink-0" />

                                            {isComplete && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                                                >
                                                    <Check className="h-2.5 w-2.5 text-black" />
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className={`
                                            text-sm font-medium
                                            ${isComplete ? "text-zinc-300" : "text-zinc-500"}
                                        `}>
                                            {step.title}
                                        </span>
                                    </div>

                                    {/* Expanded state (icon + content) */}
                                    <div
                                        className={`
                                            absolute inset-0 flex p-4 gap-4
                                            transition-opacity duration-200 delay-100
                                            ${isActive ? "opacity-100" : "opacity-0 pointer-events-none"}
                                        `}
                                    >
                                        {/* Icon column */}
                                        <div className="shrink-0">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/20 text-cyan-400">
                                                <StepIcon className="h-5 w-5" />
                                            </div>
                                        </div>

                                        {/* Content column */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={currentStep}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    {renderStepContent(step.id)}
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Code examples area - shown below cards for Install step */}
                    <AnimatePresence mode="wait">
                        {currentStep === 2 && (
                            <motion.div
                                key="step-2-content"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="mt-6"
                            >
                                {data.apiKey ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={data.apiKey || ""}
                                            readOnly
                                            className="h-9 font-mono text-xs bg-zinc-950 border-zinc-700 flex-1"
                                        />
                                        <Button
                                            onClick={copyApiKey}
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-3"
                                        >
                                            {copied ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setCurrentStep(3);
                                            }}
                                            size="sm"
                                            className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="text-xs text-amber-500 bg-amber-500/10 p-2.5 rounded border border-amber-500/20 leading-relaxed">
                                            For security, API keys are only shown once. Since you navigated away, the previous key is hidden.
                                        </div>
                                        <Button
                                            onClick={handleCreateProject}
                                            size="sm"
                                            disabled={creating}
                                            variant="outline"
                                            className="text-xs w-full h-8"
                                        >
                                            {creating ? "Generating..." : "Generate New Key"}
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {currentStep === 3 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="mt-6 space-y-4"
                            >
                                <div>
                                    <p className="text-xs text-zinc-400 mb-2 font-medium">1. Install package</p>
                                    <CodeBlock code={installCode} language="bash" fileName="terminal" />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-2 font-medium">2. Initialize client</p>
                                        <CodeBlock code={initCode} language="typescript" fileName="src/lib/fullevent.ts" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-2 font-medium">3. Send test ping <span className="text-zinc-500">(visit the page/route to trigger)</span></p>
                                        <CodeBlock code={pingCode} language="typescript" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
