import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务器外部包配置 (Next.js 16)
  serverExternalPackages: ["@ai-sdk/openai", "@ai-sdk/react"],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Turbopack 配置
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
