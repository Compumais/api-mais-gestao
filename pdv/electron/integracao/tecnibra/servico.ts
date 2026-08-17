import { createHash } from "node:crypto";
import { getConfig } from "../../db/database";
import { listarNumerosComPendencia } from "../../db/repos";
import { escreverArquivoAtomico } from "./escrever";
import { gerarXmlComandas, normalizarNumerosComanda } from "./xml";

export type StatusTecnibra = {
	enabled: boolean;
	lastSyncAt?: string;
	lastSuccessAt?: string;
	lastError?: string | null;
	commandCount: number;
	targetPath: string;
};

let sincronizando = false;
let ultimoHash = "";
let timer: NodeJS.Timeout | null = null;
let status: StatusTecnibra = {
	enabled: false,
	commandCount: 0,
	targetPath: "",
	lastError: null,
};

function mensagemErro(err: unknown): string {
	const codigo =
		err && typeof err === "object" && "code" in err
			? String((err as { code?: string }).code)
			: "";
	const detalhe = err instanceof Error ? err.message : String(err);
	if (codigo === "ENOENT") {
		return `[Tecnibra] Diretório não encontrado. ${detalhe}`;
	}
	if (codigo === "EPERM" || codigo === "EACCES") {
		return `[Tecnibra] Sem permissão para escrever. ${detalhe}`;
	}
	if (codigo === "EBUSY" || codigo === "EAGAIN") {
		return `[Tecnibra] Arquivo em uso. ${detalhe}`;
	}
	return `[Tecnibra] Falha ao atualizar arquivo XML. ${detalhe}`;
}

async function obterConfigTecnibra(): Promise<{
	enabled: boolean;
	targetPath: string;
	intervaloMs: number;
	rootElement: string;
	commandElement: string;
}> {
	const enabled = (await getConfig("tecnibra_habilitada", "0")) === "1";
	const targetPath = (
		await getConfig(
			"tecnibra_xml_path",
			"C:\\Tecnibra\\IHM Receptora\\Comandas.xml",
		)
	).trim();
	const intervaloMs = Math.max(
		1000,
		Number(await getConfig("tecnibra_intervalo_ms", "3000")) || 3000,
	);
	return {
		enabled,
		targetPath,
		intervaloMs,
		rootElement:
			(await getConfig("tecnibra_xml_root", "Comandas")).trim() || "Comandas",
		commandElement:
			(await getConfig("tecnibra_xml_item", "Comanda")).trim() || "Comanda",
	};
}

export function statusTecnibra(): StatusTecnibra {
	return { ...status };
}

export async function syncTecnibra(): Promise<void> {
	if (sincronizando) {
		return;
	}
	sincronizando = true;
	status = { ...status, lastSyncAt: new Date().toISOString() };
	try {
		const cfg = await obterConfigTecnibra();
		status = { ...status, enabled: cfg.enabled, targetPath: cfg.targetPath };
		if (!cfg.enabled || !cfg.targetPath) {
			return;
		}

		const pendentes = normalizarNumerosComanda(
			await listarNumerosComPendencia(),
		);

		const hash = createHash("sha256")
			.update(JSON.stringify(pendentes))
			.digest("hex");
		if (hash === ultimoHash && !status.lastError) {
			status = {
				...status,
				commandCount: pendentes.length,
				lastSuccessAt: new Date().toISOString(),
				lastError: null,
			};
			return;
		}

		const xml = gerarXmlComandas(pendentes, {
			rootElement: cfg.rootElement,
			commandElement: cfg.commandElement,
		});
		await escreverArquivoAtomico(cfg.targetPath, xml);
		ultimoHash = hash;
		status = {
			...status,
			commandCount: pendentes.length,
			lastSuccessAt: new Date().toISOString(),
			lastError: null,
			targetPath: cfg.targetPath,
		};
	} catch (err) {
		const mensagem = mensagemErro(err);
		status = { ...status, lastError: mensagem };
		console.error("[Tecnibra] Falha ao atualizar arquivo XML");
		console.error(err instanceof Error ? err.message : err);
	} finally {
		sincronizando = false;
	}
}

export function pararTecnibra(): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}

export async function iniciarTecnibra(): Promise<void> {
	pararTecnibra();
	const cfg = await obterConfigTecnibra();
	status = {
		...status,
		enabled: cfg.enabled,
		targetPath: cfg.targetPath,
	};
	if (!cfg.enabled) {
		return;
	}
	await syncTecnibra();
	timer = setInterval(() => {
		void syncTecnibra();
	}, cfg.intervaloMs);
}

export async function reiniciarTecnibra(): Promise<void> {
	ultimoHash = "";
	await iniciarTecnibra();
}
