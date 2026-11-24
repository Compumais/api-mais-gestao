/**
 * Em desenvolvimento, mantém .next em AppData (disco C) por falta de espaço no D:.
 * Em build/produção, .next deve ficar no projeto para o Node resolver `next` e plugins.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const webRoot = path.join(__dirname, "..");
const nextDir = path.join(webRoot, ".next");
const cacheDir = path.join(
	os.homedir(),
	"AppData",
	"Local",
	"mais-gestao-web-next",
);
const nodeModules = path.join(webRoot, "node_modules");

function isJunction(dir) {
	try {
		fs.readlinkSync(dir);
		return true;
	} catch {
		return false;
	}
}

function ensureCacheJunction() {
	if (process.platform !== "win32") return;

	fs.mkdirSync(cacheDir, { recursive: true });

	let needsLink = true;
	if (fs.existsSync(nextDir)) {
		try {
			const target = fs.readlinkSync(nextDir);
			if (path.resolve(target) === path.resolve(cacheDir)) {
				needsLink = false;
			} else {
				fs.rmdirSync(nextDir);
			}
		} catch {
			fs.rmSync(nextDir, { recursive: true, force: true });
		}
	}

	if (needsLink) {
		execFileSync("cmd.exe", ["/c", "mklink", "/J", nextDir, cacheDir], {
			stdio: "inherit",
		});
	}
}

/** Remove junção .next (sem apagar o cache no C:) para o build usar pasta real no projeto. */
function ensureLocalNextDirForBuild() {
	if (process.platform !== "win32") return;
	if (!fs.existsSync(nextDir)) return;

	if (isJunction(nextDir)) {
		fs.rmdirSync(nextDir);
		return;
	}
}

function envComNodePath(baseEnv = process.env) {
	return {
		...baseEnv,
		NODE_PATH: [nodeModules, baseEnv.NODE_PATH]
			.filter(Boolean)
			.join(path.delimiter),
	};
}

module.exports = {
	webRoot,
	nodeModules,
	ensureCacheJunction,
	ensureLocalNextDirForBuild,
	envComNodePath,
};
