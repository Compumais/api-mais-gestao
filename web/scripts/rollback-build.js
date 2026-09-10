/**
 * Restaura .next-previous em .next.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const previousDir = path.join(root, ".next-previous");
const liveDir = path.join(root, ".next");
const pm2ProcessName = "web-mais-gestao";

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

const runPm2 = (args, errorMessage, stdio = "inherit") => {
	const isWin = process.platform === "win32";
	const pm2Cmd = isWin ? "pm2.cmd" : "pm2";
	const result = spawnSync(pm2Cmd, args, { cwd: root, stdio });

	if (result.status !== 0) {
		throw new Error(errorMessage);
	}
};

const assertPm2Process = () => {
	if (!commandExists("pm2")) {
		throw new Error("PM2 não encontrado no PATH; rollback cancelado.");
	}

	runPm2(
		["describe", pm2ProcessName],
		`Processo PM2 "${pm2ProcessName}" não existe; rollback cancelado.`,
		"ignore",
	);
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
	assertPm2Process();

	if (!fs.existsSync(path.join(previousDir, "BUILD_ID"))) {
		log("Não há .next-previous válido para reverter.");
		process.exit(1);
	}

	log(`Parando temporariamente o processo PM2 "${pm2ProcessName}"...`);
	runPm2(
		["stop", pm2ProcessName],
		`Falha ao parar o processo PM2 "${pm2ProcessName}".`,
	);

	try {
		log("Restaurando .next-previous → .next...");
		publishToTarget(previousDir, liveDir);
	} finally {
		log(`Reiniciando o processo PM2 "${pm2ProcessName}"...`);
		runPm2(
			["restart", pm2ProcessName, "--update-env"],
			`Não foi possível reiniciar "${pm2ProcessName}" após o rollback.`,
		);
	}

	log(`Rollback concluído e processo "${pm2ProcessName}" reiniciado.`);
};

main();
