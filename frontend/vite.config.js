import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const certDir = path.resolve(__dirname, "../certs");
  const keyPath = path.join(certDir, "key.pem");
  const certPath = path.join(certDir, "cert.pem");

  // Serve the dev server over HTTPS only when explicitly enabled AND the
  // self-signed certs exist — otherwise fall back to plain HTTP so local
  // dev works without any cert setup.
  const useHttps =
    env.VITE_HTTPS === "true" && fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    plugins: [react()],
    server: useHttps
      ? { https: { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) } }
      : {},
  };
});
