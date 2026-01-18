import { LogLineLogo } from "@/components/landing/logo";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <LogLineLogo size={48} animated={true} variant="stream" autoPlay={true} />
        </div>
    );
}