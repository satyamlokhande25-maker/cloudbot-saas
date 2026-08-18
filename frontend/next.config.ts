import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.226.232.27', 'localhost:3000'],
  typescript: {
    // Production build ke waqt TypeScript errors ignore karega
    ignoreBuildErrors: true,
  },
  eslint: {
    // Production build ke waqt ESLint warnings/errors ignore karega
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;