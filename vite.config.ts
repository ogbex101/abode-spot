import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    // Raise the chunk size warning threshold (Vercel has no hard limit for SPA)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunking to keep vendor bundles separate and cache-friendly
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["@tanstack/react-router", "@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "sonner", "clsx", "tailwind-merge"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
  // Ensure env vars are read correctly on Vercel
  envPrefix: "VITE_",
});
