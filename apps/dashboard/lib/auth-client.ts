import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3000",
    basePath: "/api/v1/identity",
    plugins: [
        apiKeyClient()
    ]
})
