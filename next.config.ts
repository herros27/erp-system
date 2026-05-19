import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Mengabaikan error TypeScript saat build di Vercel/Production
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
