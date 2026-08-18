import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;