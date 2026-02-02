import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb", // 添付ファイル最大25MB + メタデータ
    },
  },
};

export default nextConfig;
