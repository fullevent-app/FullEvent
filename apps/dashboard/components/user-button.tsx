"use client";

import { useUser } from "@stackframe/stack";
import { stackClientApp } from "@/stack/client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserButton() {
    const user = useUser();
    const router = useRouter();

    if (!user) return null;

    const initials = user.displayName
        ? user.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.primaryEmail?.slice(0, 2).toUpperCase() || "??";

    const handleSignOut = async () => {
        await stackClientApp.signOut();
        router.push("/auth");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                        {user.profileImageUrl ? (
                            <img
                                src={user.profileImageUrl}
                                alt={user.displayName || "User avatar"}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-xs font-medium text-zinc-300">
                                {initials}
                            </span>
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" sideOffset={8} forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-zinc-200">
                            {user.displayName || "User"}
                        </p>
                        <p className="text-xs leading-none text-zinc-500">
                            {user.primaryEmail}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
