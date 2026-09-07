import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  build: {
    outDir: path.resolve(__dirname, "client/dist"),
    sourcemap: true,
  },
});
