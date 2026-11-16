import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nextDir = path.join(webRoot, ".next");
const cacheDir = path.join(os.homedir(), "AppData", "Local", "mais-gestao-web-next");
const nodeModules = path.join(webRoot, "node_modules");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

function ensureCacheJunction() {
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

ensureCacheJunction();

const env = {
	...process.env,
	NODE_PATH: [nodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
};

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
	cwd: webRoot,
	env,
	stdio: "inherit",
});

child.on("exit", (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
