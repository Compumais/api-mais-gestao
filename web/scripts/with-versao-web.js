/**
 * Gera um id novo a cada build e entrega para o Next.
 * O cliente compara esse id com /versao e recarrega quando a VPS publica outro.
 */
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const versao = process.env.WEB_BUILD_ID || randomBytes(8).toString("hex");

/**
 * No Windows, `pnpm dev` (scripts/dev.mjs) troca .next por uma junction para
 * %LOCALAPPDATA%. Fora da árvore do projeto o Node não acha web/node_modules
 * e o build quebra (@tailwindcss/postcss, next/dist/compiled/...).
 * Remove só o link; o dev recria quando rodar de novo.
 */
function removerJunctionDoDev() {
	const distDir = path.join(root, process.env.NEXT_DIST_DIR || ".next");
	try {
		if (fs.lstatSync(distDir).isSymbolicLink()) {
			fs.unlinkSync(distDir);
		}
	} catch (erro) {
		if (erro.code !== "ENOENT") throw erro;
	}
}

removerJunctionDoDev();

const resultado = spawnSync(process.execPath, [nextBin, "build"], {
	cwd: root,
	stdio: "inherit",
	env: {
		...process.env,
		WEB_BUILD_ID: versao,
	},
});

process.exit(resultado.status ?? 1);
