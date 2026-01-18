import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stackServerApp } from "@/stack/server";

export async function middleware(request: NextRequest) {
    const user = await stackServerApp.getUser();
    const path = request.nextUrl.pathname;

    // 1. Authenticated User Logic
    if (user) {
        // If user is already logged in and tries to access login page, redirect to home
        if (path.startsWith("/login")) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        // Allow access to other pages
        return NextResponse.next();
    }

    // 2. Unauthenticated User Logic
    // Check for public routes
    if (
        path.startsWith("/login") ||
        path.startsWith("/handler") ||
        path.startsWith("/api/webhooks")
    ) {
        return NextResponse.next();
    }

    // Redirect to login for protected routes
    return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api/webhooks (public functionality)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * 
         * Note: 'login' and 'handler' are INCLUDED in matching now so we can 
         * redirect authenticated users away from them if needed, or allow unauthenticated access.
         */
        "/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)",
    ],
};
