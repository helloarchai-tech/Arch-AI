import type { NextConfig } from "next";

const rawBackendApi =
  process.env.BACKEND_API_URL || "http://127.0.0.1:8000/api";

function normalizeBackendApi(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${normalizeBackendApi(rawBackendApi)}/:path*`,
      },
    ];
  },
};

export default nextConfig;
