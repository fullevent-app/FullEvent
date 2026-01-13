import { GridLoader } from "@/components/ui/grid-loader";

export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
            <GridLoader size={64} color="#22d3ee" pattern="ripple-out" />
        </div>
    );
}
