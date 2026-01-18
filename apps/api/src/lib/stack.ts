import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
    tokenStore: "nextjs-cookie",
    urls: {
        signIn: "/signin",
        signUp: "/signup",
        signOut: "/",
    },
});
