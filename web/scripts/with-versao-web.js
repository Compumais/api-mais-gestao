/**
 * Gera um id novo a cada build e entrega para o Next.
 * O cliente compara esse id com /versao e recarrega quando a VPS publica outro.
 */
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const versao = process.env.WEB_BUILD_ID || randomBytes(8).toString("hex");

const resultado = spawnSync(process.execPath, [nextBin, "build"], {
	cwd: root,
	stdio: "inherit",
	env: {
		...process.env,
		WEB_BUILD_ID: versao,
	},
});

process.exit(resultado.status ?? 1);
