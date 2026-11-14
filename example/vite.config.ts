import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The example reads the library sources directly (edits show up immediately).
export default defineConfig({
    base: "./",
    plugins: [react()],
    resolve: {
        alias: {
            "@ehfuse/outliner": path.resolve(__dirname, "../packages/outliner/src"),
            "@ehfuse/mindmap": path.resolve(__dirname, "../packages/mindmap/src"),
        },
    },
});
