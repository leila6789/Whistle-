import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound to 0.0.0.0 and opened at 127.0.0.1. Without this,
  // Next blocks the dev client and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
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
