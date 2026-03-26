import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: "src/main.ts",
            name: "MitAudioPlayer",
            formats: ["es"],
            fileName: "mit-audio-player",
        },
        minify: "terser",
    },
});
