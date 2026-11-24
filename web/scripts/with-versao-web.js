/**
 * Gera um id novo a cada build e entrega para o Next.
 * O cliente compara esse id com /versao e recarrega quando a VPS publica outro.
 */
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const {
	ensureLocalNextDirForBuild,
	envComNodePath,
	webRoot,
} = require("./ensure-next-cache.cjs");

const nextBin = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
const versao = process.env.WEB_BUILD_ID || randomBytes(8).toString("hex");

/**
 * No Windows, `pnpm dev` troca .next por uma junção para %LOCALAPPDATA%.
 * Fora da árvore do projeto o Node não acha web/node_modules e o build quebra
 * (@tailwindcss/postcss, next/dist/compiled/...). Remove só o link; o dev recria.
 */
if (!process.env.NEXT_DIST_DIR || process.env.NEXT_DIST_DIR === ".next") {
	ensureLocalNextDirForBuild();
}

const resultado = spawnSync(process.execPath, [nextBin, "build"], {
	cwd: webRoot,
	stdio: "inherit",
	env: {
		...envComNodePath(),
		WEB_BUILD_ID: versao,
	},
});

process.exit(resultado.status ?? 1);
