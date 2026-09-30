import { cStatIndicaAutorizacao } from "@/util/resolver-status-emissao-nfe.js";
import { cStatIndicaDuplicidadeNfce } from "./extrair-chave-duplicidade-nfce.js";
import type {
	ClasseConsultaChaveNfce,
	ClasseResultadoTransmissaoNfce,
} from "./tipos-conciliacao-nfce.js";

const CSTAT_PROCESSANDO = new Set(["103", "104", "105", "108", "109"]);
const CSTAT_CANCELADA = new Set(["101", "135", "155"]);
const CSTAT_DENEGADA = new Set(["110", "301", "302", "303"]);

function textoIndicaFalhaComunicacao(texto: string): boolean {
	return /tempo esgotado|timeout|abort|econnreset|econnrefused|enotfound|fetch failed|network|socket hang up|resposta vazia|resposta inválida|eai_again|não foi possível conectar/i.test(
		texto,
	);
}

export function classificarResultadoTransmissaoNfce(entrada: {
	cStat?: string | number | null;
	protocolo?: string | null;
	erro?: string | null;
	xMotivo?: string | null;
	sucesso?: boolean;
}): ClasseResultadoTransmissaoNfce {
	if (
		cStatIndicaAutorizacao(entrada.cStat) ||
		Boolean(entrada.protocolo?.trim() && cStatIndicaAutorizacao(entrada.cStat))
	) {
		return "autorizada";
	}

	const cStat = String(entrada.cStat ?? "").trim();
	if (cStatIndicaDuplicidadeNfce(cStat)) {
		return "duplicidade";
	}

	if (cStat && CSTAT_PROCESSANDO.has(cStat)) {
		return "desconhecida";
	}

	if (!cStat) {
		const erro = `${entrada.erro ?? ""} ${entrada.xMotivo ?? ""}`.trim();
		if (erro === "" || textoIndicaFalhaComunicacao(erro)) {
			return "desconhecida";
		}
		return "rejeitada";
	}

	return "rejeitada";
}

export function classificarConsultaChaveNfce(
	cStat?: string | number | null,
): ClasseConsultaChaveNfce {
	const codigo = String(cStat ?? "").trim();
	if (codigo === "100") return "autorizada";
	if (CSTAT_CANCELADA.has(codigo)) return "cancelada";
	if (CSTAT_DENEGADA.has(codigo)) return "denegada";
	if (codigo === "217") return "nao_encontrada";
	if (!codigo || CSTAT_PROCESSANDO.has(codigo)) return "desconhecida";
	return "rejeitada";
}
