import * as path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Ambiente de execução
		environment: "node",

		// Globals para não precisar importar describe, it, expect
		globals: true,

		// Cobertura de código
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"drizzle/",
				"**/*.config.ts",
				"**/*.d.ts",
				"**/index.ts",
			],
		},

		// Timeout padrão
		testTimeout: 10000,

		// Arquivos de teste
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],

		// Setup files
		setupFiles: ["./src/test/setup.ts"],
	},

	// Resolve de paths (se necessário)
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
