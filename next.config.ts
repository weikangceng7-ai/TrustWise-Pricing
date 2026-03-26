import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ai-sdk/openai", "@ai-sdk/react", "neo4j-driver"],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
