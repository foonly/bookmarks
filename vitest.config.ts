import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so tests run without the Vue and PWA
// plugins: the tested modules are plain TypeScript.
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		setupFiles: ["src/test/setup.ts"],
		restoreMocks: true,
		unstubGlobals: true,
	},
});
