import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@fullevent/react', '@stackframe/stack'],
};

export default nextConfig;
