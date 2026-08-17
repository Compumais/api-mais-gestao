import { getConfig } from "../../db/database";
import {
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

const BAUD_PADRAO = 9600;

function baudValido(valor: string): number {
	const n = Number(valor);
	if (n === 1200 || n === 2400 || n === 4800 || n === 9600 || n === 19200) {
		return n;
	}
	return BAUD_PADRAO;
}

export async function lerConfigBalanca(): Promise<BalancaConfig> {
	const portaPadrao = process.platform === "win32" ? "COM1" : "/dev/ttyUSB0";
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

export async function resetarConexaoBalanca(): Promise<void> {
	if (portaAberta) {
		await portaAberta.fechar().catch(() => undefined);
	}
	portaAberta = null;
	chavePorta = null;
	ultimoErro = "";
}

async function garantirPorta(
	config: BalancaConfig,
): Promise<PortaSerialAberta> {
	const chave = `${config.porta}|${config.baud}`;
	if (portaAberta && chavePorta === chave) {
		return portaAberta;
	}
	await resetarConexaoBalanca();
	const aberta = await comTimeout(
		abrirPortaSerial(config.porta, config.baud),
		1500,
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

async function lerPesoDaPorta(
	config: BalancaConfig,
	esperaMs: number,
): Promise<number> {
	const porta = await garantirPorta(config);
	const pedido = comandoSolicitarPeso(config.protocolo);
	if (pedido) {
		await porta.escrever(pedido).catch(() => undefined);
	}
	await esperar(esperaMs);
	const bruto = await porta.ler();
	return extrairPesoKg(bruto, config.protocolo);
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
	try {
		const peso = await lerPesoDaPorta(config, 280);
		if (peso > 0) {
			return {
				peso,
				conectado: true,
				origem: "balanca",
				mensagem: "Peso lido da balança",
			};
		}
		return {
			peso: 0,
			conectado: true,
			origem: "nenhuma",
			mensagem: "Balança conectada — coloque o produto ou digite o peso",
		};
	} catch (err) {
		ultimoErro = err instanceof Error ? err.message : "Falha na porta";
		await resetarConexaoBalanca();
		return {
			peso: 0,
			conectado: false,
			origem: "nenhuma",
			mensagem: ultimoErro,
		};
	}
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
	try {
		const peso = await lerPesoDaPorta(config, 800);
		if (peso > 0) {
			return {
				...base,
				conectado: true,
				peso,
				origem: "balanca",
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
			origem: "nenhuma",
			mensagem:
				"Porta aberta, mas nenhum peso chegou. Confira o protocolo e se há produto na balança.",
		};
	} catch (err) {
		const mensagem = err instanceof Error ? err.message : "Falha na porta";
		await resetarConexaoBalanca();
		return {
			...base,
			conectado: false,
			peso: 0,
			origem: "nenhuma",
			mensagem,
		};
	}
}
