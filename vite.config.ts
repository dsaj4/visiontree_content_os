import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

const normalizeBase = (value?: string) => {
  if (!value || value === "/") return "/";
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
};

const base = normalizeBase(process.env.CONTENT_OS_BASE);
const proxyTarget = "http://127.0.0.1:8787";
const proxy: Record<string, string> = {
  "/api": proxyTarget
};
if (base !== "/") {
  proxy[`${base}api`] = proxyTarget;
}

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy
  }
});
