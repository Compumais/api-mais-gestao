/**
 * Deploy Next.js sem derrubar o site em produção.
 *
 * Compila em ./.next-staging; só no final publica em ./.next.
 * Se o build falhar, .next permanece intacto.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const stagingDir = path.join(root, ".next-staging");
const liveDir = path.join(root, ".next");
const previousDir = path.join(root, ".next-previous");
const pm2ProcessName = "web-mais-gestao";

const log = (msg) => console.log(`[build:live] ${msg}`);

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
		throw new Error("PM2 não encontrado no PATH; publicação cancelada.");
	}

	runPm2(
		["describe", pm2ProcessName],
		`Processo PM2 "${pm2ProcessName}" não existe; publicação cancelada.`,
		"ignore",
	);
};

const assertBuildId = (dir, label) => {
	const buildIdPath = path.join(dir, "BUILD_ID");
	if (!fs.existsSync(buildIdPath)) {
		throw new Error(`BUILD_ID não encontrado em ${label} (${dir})`);
	}
};

const runStagingBuild = () => {
	const isWin = process.platform === "win32";
	const pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";

	return spawnSync(pnpmCmd, ["run", "build"], {
		cwd: root,
		stdio: "inherit",
		env: {
			...process.env,
			NEXT_DIST_DIR: ".next-staging",
			NODE_ENV: "production",
		},
	});
};

const backupCurrentLive = () => {
	if (!fs.existsSync(path.join(liveDir, "BUILD_ID"))) {
		return;
	}

	removeDir(previousDir);

	if (process.platform === "win32") {
		fs.cpSync(liveDir, previousDir, { recursive: true });
		return;
	}

	const result = spawnSync("cp", ["-a", liveDir, previousDir], {
		cwd: root,
		stdio: "inherit",
	});

	if (result.status !== 0) {
		throw new Error("Falha ao criar backup em .next-previous");
	}
};

const rsyncPublish = (source, target) => {
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
		throw new Error(`rsync falhou ao publicar em ${target}`);
	}
};

const copyPublish = (source, target) => {
	const tempDir = `${target}-next`;

	removeDir(tempDir);
	fs.cpSync(source, tempDir, { recursive: true });
	removeDir(target);
	fs.renameSync(tempDir, target);
};

const publishToTarget = (source, target) => {
	if (commandExists("rsync")) {
		rsyncPublish(source, target);
		return;
	}

	copyPublish(source, target);
};

const publishStaging = () => {
	assertBuildId(stagingDir, ".next-staging");

	log("Gerando backup da versão ao vivo em .next-previous...");
	backupCurrentLive();

	let processStopped = false;

	try {
		log(`Parando temporariamente o processo PM2 "${pm2ProcessName}"...`);
		runPm2(
			["stop", pm2ProcessName],
			`Falha ao parar o processo PM2 "${pm2ProcessName}".`,
		);
		processStopped = true;

		log("Publicando .next-staging → .next...");
		publishToTarget(stagingDir, liveDir);
		assertBuildId(liveDir, ".next");

		log(`Reiniciando o processo PM2 "${pm2ProcessName}"...`);
		runPm2(
			["restart", pm2ProcessName, "--update-env"],
			`Build publicado, mas não foi possível reiniciar "${pm2ProcessName}".`,
		);
		processStopped = false;
		removeDir(stagingDir);
	} catch (error) {
		if (processStopped) {
			if (fs.existsSync(path.join(previousDir, "BUILD_ID"))) {
				log("Falha na publicação — restaurando .next-previous...");
				publishToTarget(previousDir, liveDir);
			}

			log(`Religando o processo PM2 "${pm2ProcessName}"...`);
			runPm2(
				["restart", pm2ProcessName, "--update-env"],
				`Falha ao recuperar o processo PM2 "${pm2ProcessName}".`,
			);
		}

		throw error;
	}
};

const main = () => {
	assertPm2Process();

	const hasLiveSite = fs.existsSync(path.join(liveDir, "BUILD_ID"));

	if (!hasLiveSite) {
		log(
			"Nenhum build publicado ainda — a primeira publicação ocorrerá ao final.",
		);
	} else {
		log(
			"Compilando em ./.next-staging (.next não será alterado até o build concluir)...",
		);
	}

	removeDir(stagingDir);

	const result = runStagingBuild();

	if (result.status !== 0) {
		log("Build falhou — site em produção não foi alterado.");
		removeDir(stagingDir);
		process.exit(result.status || 1);
	}

	log("Publicando nova versão...");
	publishStaging();

	log(`Concluído. Build publicado e processo "${pm2ProcessName}" reiniciado.`);
};

main();
