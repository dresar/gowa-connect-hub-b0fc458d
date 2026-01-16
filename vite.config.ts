import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = (env.API_URL || "https://gowa.ekacode.web.id").replace(/\/+$/, "");

  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: ["depan.ekacode.web.id"],
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (p: string) => p.replace(/^\/api/, ""),
        },
      },
    },
    envPrefix: ["VITE_", "API_", "DASH_"],
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
