import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.APP_BASE || "/", // e.g. APP_BASE=/manage/ pnpm build
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8080" } },
});
