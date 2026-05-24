import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

// Standalone Vite SPA config for Vercel deployment
// Does NOT use @cloudflare/vite-plugin or TanStack Start SSR
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    viteTsconfigPaths(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 8080,
  },
});
