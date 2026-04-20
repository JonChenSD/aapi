import type { NextConfig } from "next";

const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const basePath = raw.replace(/\/$/, "") || "";
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  images: {
    unoptimized: true,
  },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
