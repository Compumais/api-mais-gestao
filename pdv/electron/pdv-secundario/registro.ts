import { v4 as uuidv4 } from "uuid";
import { getConfig, setConfig } from "../db/database";
import { parseNumeroPdv, validarNumeroPdv } from "./regras";

export type TerminalPdv = {
	numero: number;
	identificador: string;
	token: string;
	vistoem: string;
};

const CHAVE = "pdv_terminais";

export async function lerTerminais(): Promise<TerminalPdv[]> {
	const raw = await getConfig(CHAVE, "[]");
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed
			.map((item) => {
				if (!item || typeof item !== "object") {
					return null;
				}
				const t = item as Record<string, unknown>;
				const numero = parseNumeroPdv(t.numero as string | number);
				const identificador = String(t.identificador ?? "").trim();
				const token = String(t.token ?? "").trim();
				if (!numero || !identificador || !token) {
					return null;
				}
				return {
					numero,
					identificador,
					token,
					vistoem: String(t.vistoem ?? ""),
				};
			})
			.filter((t): t is TerminalPdv => t !== null);
	} catch {
		return [];
	}
}

async function salvarTerminais(terminais: TerminalPdv[]): Promise<void> {
	await setConfig(CHAVE, JSON.stringify(terminais));
}

export async function numerosOcupadosPorSecundarios(
	excetoIdentificador?: string,
): Promise<number[]> {
	const terminais = await lerTerminais();
	return terminais
		.filter((t) => t.identificador !== excetoIdentificador)
		.map((t) => t.numero);
}

export async function tokenTerminalValido(token: string): Promise<boolean> {
	if (!token.trim()) {
		return false;
	}
	const terminais = await lerTerminais();
	return terminais.some((t) => t.token === token);
}

export async function handshakeTerminal(params: {
	numeropdv: number | string;
	identificador: string;
	numeroPrincipal: number;
}): Promise<{ token: string; numeropdv: number }> {
	const identificador = params.identificador.trim();
	if (!identificador) {
		throw new Error("Identificador do PDV secundário ausente.");
	}

	const ocupados = await numerosOcupadosPorSecundarios(identificador);
	const validacao = validarNumeroPdv({
		proposto: params.numeropdv,
		numeroPrincipal: params.numeroPrincipal,
		ocupados,
	});
	if (!validacao.ok) {
		const err = new Error(validacao.mensagem);
		err.name = "NumeroPdvDuplicadoError";
		throw err;
	}

	const agora = new Date().toISOString();
	const terminais = await lerTerminais();
	const existente = terminais.find((t) => t.identificador === identificador);
	const token = existente?.token || uuidv4();
	const proximo: TerminalPdv = {
		numero: validacao.numero,
		identificador,
		token,
		vistoem: agora,
	};
	const demais = terminais.filter((t) => t.identificador !== identificador);
	await salvarTerminais([...demais, proximo]);
	return { token, numeropdv: validacao.numero };
}

export async function assertNumeroPrincipalLivre(
	numero: number,
): Promise<void> {
	const choque = (await lerTerminais()).find((t) => t.numero === numero);
	if (choque) {
		throw new Error(
			`O número ${numero} já está em uso por um PDV secundário. Escolha outro ou desconecte o terminal.`,
		);
	}
}
