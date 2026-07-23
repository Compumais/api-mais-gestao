/**
 * Restaura .next-previous em .next.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const previousDir = path.join(root, ".next-previous");
const liveDir = path.join(root, ".next");

const log = (msg) => console.log(`[build:rollback] ${msg}`);

const removeDir = (dir) => {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

const commandExists = (cmd) => {
	const checker = process.platform === "win32" ? "where" : "which";
	const result = spawnSync(checker, [cmd], { stdio: "ignore" });
	return result.status === 0;
};

const publishToTarget = (source, target) => {
	if (commandExists("rsync")) {
		if (!fs.existsSync(target)) {
			fs.mkdirSync(target, { recursive: true });
		}

		const result = spawnSync(
			"rsync",
			[
				"-a",
				"--delete",
				"--delay-updates",
				"--partial-dir=.rsync-partial",
				`${source}/`,
				`${target}/`,
			],
			{ cwd: root, stdio: "inherit" },
		);

		if (result.status !== 0) {
			process.exit(result.status || 1);
		}
		return;
	}

	removeDir(target);
	fs.cpSync(source, target, { recursive: true });
};

const main = () => {
	if (!fs.existsSync(path.join(previousDir, "BUILD_ID"))) {
		log("Não há .next-previous válido para reverter.");
		process.exit(1);
	}

	log("Restaurando .next-previous → .next...");
	publishToTarget(previousDir, liveDir);

	log("Rollback concluído — .next restaurado.");
	log("Recarregue o PM2: pm2 reload mais-gestao-web --update-env");
};

main();
