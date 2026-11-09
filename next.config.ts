import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    proxyClientMaxBodySize: "55mb",
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@jspawn/ghostscript-wasm/gs.wasm"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
