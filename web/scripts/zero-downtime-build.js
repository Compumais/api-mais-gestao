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

	log("Publicando .next-staging → .next...");
	publishToTarget(stagingDir, liveDir);
	assertBuildId(liveDir, ".next");

	removeDir(stagingDir);
};

const main = () => {
	const hasLiveSite = fs.existsSync(path.join(liveDir, "BUILD_ID"));

	if (!hasLiveSite) {
		log("Nenhum build publicado ainda — a primeira publicação ocorrerá ao final.");
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

	log("Concluído. Build publicado em .next sem downtime no disco.");
	log("Reinicie/recarregue o PM2: pm2 reload mais-gestao-web --update-env");
};

main();
