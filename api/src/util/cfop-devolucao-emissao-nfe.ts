import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";

export type TipoDevolucaoNfe = "compra" | "venda";

/** Heurística para CFOP de saída de devolução de compra (ex.: 5202, 6202, 5411). */
export function isCfopDevolucaoSaidaHeuristica(codigo: string): boolean {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length < 4) return false;
	if (!["5", "6", "7"].includes(digitos[0] ?? "")) return false;

	if (digitos[1] === "2") return true;
	if (digitos.slice(1, 3) === "41") return true;

	return false;
}

/** Heurística para CFOP de entrada de devolução de venda (ex.: 1202, 2202, 1411). */
export function isCfopDevolucaoEntradaHeuristica(codigo: string): boolean {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length < 4) return false;
	if (!["1", "2", "3"].includes(digitos[0] ?? "")) return false;

	if (digitos[1] === "2") return true;
	if (digitos.slice(1, 3) === "41") return true;

	return false;
}

export function detectarTipoDevolucaoPorCfop(
	codigo: string,
): TipoDevolucaoNfe | null {
	if (isCfopDevolucaoSaidaHeuristica(codigo)) return "compra";
	if (isCfopDevolucaoEntradaHeuristica(codigo)) return "venda";
	return null;
}

export async function cfopExigeDocumentoReferenciado(
	idempresa: string,
	codigoCfop: string,
): Promise<boolean> {
	const cfop = await buscarCfopPorCodigo(idempresa, codigoCfop);
	if (cfop?.exigirdocumentoreferenciado === 1) return true;
	if (cfop?.consideradevolucaovenda === 1) return true;
	return (
		isCfopDevolucaoSaidaHeuristica(codigoCfop) ||
		isCfopDevolucaoEntradaHeuristica(codigoCfop)
	);
}

export async function emissaoRequerDocumentoReferenciado(
	idempresa: string,
	cfops: string[],
): Promise<boolean> {
	const codigos = [...new Set(cfops.map((c) => c.replace(/\D/g, "")).filter(Boolean))];
	for (const codigo of codigos) {
		if (await cfopExigeDocumentoReferenciado(idempresa, codigo)) {
			return true;
		}
	}
	return false;
}

export async function resolverTipoDevolucaoEmissao(
	idempresa: string,
	cfops: string[],
	tipoInformado?: TipoDevolucaoNfe,
): Promise<TipoDevolucaoNfe | null> {
	if (tipoInformado) return tipoInformado;

	for (const cfop of cfops) {
		const tipo = detectarTipoDevolucaoPorCfop(cfop);
		if (tipo) return tipo;
	}

	for (const cfop of cfops) {
		if (await cfopExigeDocumentoReferenciado(idempresa, cfop)) {
			const digitos = cfop.replace(/\D/g, "");
			if (["1", "2", "3"].includes(digitos[0] ?? "")) return "venda";
			if (["5", "6", "7"].includes(digitos[0] ?? "")) return "compra";
		}
	}

	return null;
}

/** Converte CFOP de entrada (1xxx/2xxx) para saída de devolução de compra. */
export function inferirCodigoCfopDevolucaoSaida(codigoEntrada: string): string | null {
	const digitos = codigoEntrada.replace(/\D/g, "");
	if (digitos.length < 4) return null;

	const prefixo =
		digitos[0] === "1" ? "5" : digitos[0] === "2" ? "6" : digitos[0] === "3" ? "7" : null;

	if (!prefixo) return null;

	return `${prefixo}2${digitos.slice(2)}`;
}

/** Converte CFOP de saída de venda (5xxx/6xxx) para entrada de devolução de venda. */
export function inferirCodigoCfopDevolucaoEntrada(codigoSaida: string): string | null {
	const digitos = codigoSaida.replace(/\D/g, "");
	if (digitos.length < 4) return null;

	if (digitos[0] === "5") return `12${digitos.slice(2)}`;
	if (digitos[0] === "6") return `22${digitos.slice(2)}`;
	if (digitos[0] === "7") return `32${digitos.slice(2)}`;

	return null;
}

export function resolverTpNfDevolucao(tipo: TipoDevolucaoNfe): number {
	return tipo === "venda" ? 0 : 1;
}

export const FIN_NFE_NORMAL = 1;
export const FIN_NFE_DEVOLUCAO = 4;
