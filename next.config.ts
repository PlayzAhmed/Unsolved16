import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const lanOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((iface) => iface !== undefined)
  .filter((iface) => iface.family === "IPv4" && !iface.internal)
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: lanOrigins,
  serverExternalPackages: ["tesseract.js"],
  cacheComponents: true,
  partialPrefetching: true,
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
