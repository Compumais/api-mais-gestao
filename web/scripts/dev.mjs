import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
	ensureCacheJunction,
	envComNodePath,
	webRoot,
} = require("./ensure-next-cache.cjs");

const nextBin = require.resolve("next/dist/bin/next");

ensureCacheJunction();

const child = spawn(
	process.execPath,
	[nextBin, "dev", ...process.argv.slice(2)],
	{
		cwd: webRoot,
		env: envComNodePath(),
		stdio: "inherit",
	},
);

child.on("exit", (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
