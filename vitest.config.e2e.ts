import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "e2e",
		include: ["**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		environment: "node",
		globals: true,
		testTimeout: 30000,
		setupFiles: ["./src/test/setup-e2e.ts"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
