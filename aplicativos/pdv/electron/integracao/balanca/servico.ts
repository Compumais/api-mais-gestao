import { getConfig } from "../../db/database";
import {
	comandoFallbackEmuladorToledo,
	comandoSolicitarPeso,
	extrairPesoKg,
	normalizarProtocoloBalanca,
	type ProtocoloBalanca,
} from "./protocolo";
import {
	abrirPortaSerial,
	listarPortasSeriais,
	type PortaSerialAberta,
} from "./serial";

export type BalancaConfig = {
	habilitado: boolean;
	porta: string;
	baud: number;
	protocolo: ProtocoloBalanca;
};

export type BalancaStatus = {
	habilitado: boolean;
	porta: string;
	baud: number;
	protocolo: ProtocoloBalanca;
	conectado: boolean;
	mensagem: string;
};

export type BalancaPeso = {
	peso: number;
	conectado: boolean;
	origem: "balanca" | "nenhuma";
	mensagem: string;
};

let portaAberta: PortaSerialAberta | null = null;
let chavePorta: string | null = null;
let ultimoErro = "";
let cadeia: Promise<unknown> = Promise.resolve();

/** Uma leitura por vez. A segunda espera; não fecha a porta da primeira. */
function emExclusao<T>(trabalho: () => Promise<T>): Promise<T> {
	const resultado = cadeia.then(trabalho, trabalho);
	cadeia = resultado.then(
		() => undefined,
		() => undefined,
	);
	return resultado;
}

const BAUD_PADRAO = 9600;

function baudValido(valor: string): number {
	const n = Number(valor);
	if (n === 1200 || n === 2400 || n === 4800 || n === 9600 || n === 19200) {
		return n;
	}
	return BAUD_PADRAO;
}

export async function lerConfigBalanca(): Promise<BalancaConfig> {
	const portaPadrao = "";
	return {
		habilitado: (await getConfig("balanca_habilitada", "0")) === "1",
		porta:
			(await getConfig("balanca_porta", portaPadrao)).trim() || portaPadrao,
		baud: baudValido(await getConfig("balanca_baud", String(BAUD_PADRAO))),
		protocolo: normalizarProtocoloBalanca(
			await getConfig("balanca_protocolo", "toledo"),
		),
	};
}

async function fecharPortaAtual(): Promise<void> {
	const aberta = portaAberta;
	portaAberta = null;
	chavePorta = null;
	ultimoErro = "";
	if (aberta) {
		await aberta.fechar().catch(() => undefined);
	}
}

export async function resetarConexaoBalanca(): Promise<void> {
	await emExclusao(() => fecharPortaAtual());
}

async function garantirPorta(
	config: BalancaConfig,
): Promise<PortaSerialAberta> {
	const chave = `${config.porta}|${config.baud}`;
	if (portaAberta && chavePorta === chave) {
		return portaAberta;
	}
	await fecharPortaAtual();
	const aberta = await comTimeout(
		abrirPortaSerial(config.porta, config.baud),
		8000,
		`Tempo esgotado ao abrir ${config.porta}`,
	);
	portaAberta = aberta;
	chavePorta = chave;
	ultimoErro = "";
	return aberta;
}

function esperar(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function comTimeout<T>(
	promessa: Promise<T>,
	ms: number,
	mensagem: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promessa,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => reject(new Error(mensagem)), ms);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export async function statusBalanca(): Promise<BalancaStatus> {
	const config = await lerConfigBalanca();
	if (!config.habilitado) {
		return {
			...config,
			conectado: false,
			mensagem: "Balança desligada — peso será digitado se o produto for em kg",
		};
	}
	if (!config.porta) {
		return {
			...config,
			conectado: false,
			mensagem: "Informe a porta serial da balança",
		};
	}
	return {
		...config,
		conectado:
			portaAberta != null && chavePorta === `${config.porta}|${config.baud}`,
		mensagem: ultimoErro
			? ultimoErro
			: `Porta ${config.porta} · ${config.baud} bps · ${config.protocolo}`,
	};
}

export async function listarPortasBalanca(): Promise<string[]> {
	return listarPortasSeriais();
}

/**
 * Junta os bytes até um silêncio curto ou o timeout, no lugar de um único
 * snapshot de BytesToRead. É o RecvPacket da ACBr.
 */
async function lerPacote(
	porta: PortaSerialAberta,
	timeoutMs: number,
): Promise<Buffer> {
	const inicio = Date.now();
	const partes: Buffer[] = [];
	let ultimoDado = 0;
	const silencioMs = 80;
	while (Date.now() - inicio < timeoutMs) {
		const pedaco = await porta.ler();
		if (pedaco.length > 0) {
			partes.push(pedaco);
			ultimoDado = Date.now();
		} else if (partes.length > 0 && Date.now() - ultimoDado >= silencioMs) {
			break;
		}
		const restante = timeoutMs - (Date.now() - inicio);
		if (restante <= 0) break;
		await esperar(Math.min(40, restante));
	}
	return partes.length > 0 ? Buffer.concat(partes) : Buffer.alloc(0);
}

function portaRecuperavel(err: unknown): boolean {
	const mensagem = err instanceof Error ? err.message : String(err);
	return /sem permissão para abrir|não autoriz|nao autoriz|acesso negado|unauthorized|porta fechada/i.test(
		mensagem,
	);
}

async function lerPesoDaPorta(
	config: BalancaConfig,
	timeoutMs: number,
): Promise<number> {
	try {
		return await lerPesoNaPortaAberta(config, timeoutMs);
	} catch (err) {
		if (!portaRecuperavel(err)) throw err;
		await fecharPortaAtual();
		return lerPesoNaPortaAberta(config, timeoutMs);
	}
}

async function lerPesoNaPortaAberta(
	config: BalancaConfig,
	timeoutMs: number,
): Promise<number> {
	const porta = await garantirPorta(config);
	const pedido = comandoSolicitarPeso(config.protocolo);
	if (pedido) {
		await porta.limpar().catch(() => undefined);
		await porta.escrever(pedido);
		await esperar(200);
	}
	let bruto = await lerPacote(porta, timeoutMs);
	let peso = extrairPesoKg(bruto, config.protocolo);
	if (peso <= 0 && bruto.length === 0 && config.protocolo === "toledo") {
		await porta.escrever(comandoFallbackEmuladorToledo());
		await esperar(200);
		bruto = await lerPacote(porta, timeoutMs);
		peso = extrairPesoKg(bruto, config.protocolo);
	}
	return peso;
}

export async function lerPesoBalanca(): Promise<BalancaPeso> {
	const config = await lerConfigBalanca();
	if (!config.habilitado) {
		return {
			peso: 0,
			conectado: false,
			origem: "nenhuma",
			mensagem: "Balança desligada",
		};
	}
	return emExclusao(async () => {
		try {
			const peso = await lerPesoDaPorta(config, 800);
			if (peso > 0) {
				return {
					peso,
					conectado: true,
					origem: "balanca" as const,
					mensagem: "Peso lido da balança",
				};
			}
			return {
				peso: 0,
				conectado: true,
				origem: "nenhuma" as const,
				mensagem: "Balança conectada — coloque o produto ou digite o peso",
			};
		} catch (err) {
			ultimoErro = err instanceof Error ? err.message : "Falha na porta";
			await fecharPortaAtual();
			return {
				peso: 0,
				conectado: false,
				origem: "nenhuma" as const,
				mensagem: ultimoErro,
			};
		}
	});
}

export async function testarBalanca(): Promise<BalancaPeso & BalancaStatus> {
	const config = await lerConfigBalanca();
	const base = await statusBalanca();
	if (!config.habilitado) {
		return {
			...base,
			peso: 0,
			origem: "nenhuma",
		};
	}
	return emExclusao(async () => {
		try {
			const peso = await lerPesoDaPorta(config, 2000);
			if (peso > 0) {
				return {
					...base,
					conectado: true,
					peso,
					origem: "balanca" as const,
					mensagem: `Peso lido: ${peso.toLocaleString("pt-BR", {
						minimumFractionDigits: 3,
						maximumFractionDigits: 3,
					})} kg`,
				};
			}
			return {
				...base,
				conectado: true,
				peso: 0,
				origem: "nenhuma" as const,
				mensagem:
					"Porta aberta, mas nenhum peso chegou. Confira o protocolo e se há produto na balança.",
			};
		} catch (err) {
			const mensagem = err instanceof Error ? err.message : "Falha na porta";
			ultimoErro = mensagem;
			await fecharPortaAtual();
			return {
				...base,
				conectado: false,
				peso: 0,
				origem: "nenhuma" as const,
				mensagem,
			};
		}
	});
}
