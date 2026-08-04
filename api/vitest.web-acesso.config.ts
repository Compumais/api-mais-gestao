import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const raizApi = path.dirname(fileURLToPath(import.meta.url));
const raizWeb = path.resolve(raizApi, "../web");

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["src/lib/acesso-navegacao.test.ts"],
		root: raizWeb,
	},
	resolve: {
		alias: {
			"@": path.resolve(raizWeb, "src"),
		},
	},
});
