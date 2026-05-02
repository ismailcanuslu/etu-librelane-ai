import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker (multi-stage) — `npm run build` sonrası `.next/standalone` üretir
  output: "standalone",
};

export default nextConfig;
