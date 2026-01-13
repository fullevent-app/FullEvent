import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@fullevent/react'],
  // Note: Build-time string replacement for obscuring "better-auth" references
  // would require additional setup. The primary obscuration comes from:
  // 1. Custom route path: /api/v1/identity (not /api/auth)
  // 2. Custom cookie prefix: fe (not better-auth)
  // 3. Closed-source dashboard code
};

export default nextConfig;

