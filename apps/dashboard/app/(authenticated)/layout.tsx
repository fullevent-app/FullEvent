import { DashboardContent } from "@/components/dashboard-content";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardContent>{children}</DashboardContent>;
}
