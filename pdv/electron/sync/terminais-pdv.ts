import { listarTerminaisPdv } from "../api/client";
import { getConfig, setConfig } from "../db/database";
import { obterSessao } from "../db/repos";

export const CHAVE_CACHE_TERMINAIS_PDV = "terminais_pdv_json";

export type TerminalPdvOpcao = {
	numeropdv: number;
	descricao: string | null;
};

export function parseCacheTerminais(json: string): TerminalPdvOpcao[] {
	try {
		const bruto = JSON.parse(json) as unknown;
		if (!Array.isArray(bruto)) {
			return [];
		}
		return bruto
			.map((item) => {
				if (!item || typeof item !== "object") {
					return null;
				}
				const row = item as { numeropdv?: unknown; descricao?: unknown };
				const numeropdv = Number(row.numeropdv);
				if (!Number.isInteger(numeropdv) || numeropdv < 1) {
					return null;
				}
				const descricao =
					typeof row.descricao === "string" && row.descricao.trim()
						? row.descricao.trim()
						: null;
				return { numeropdv, descricao };
			})
			.filter((item): item is TerminalPdvOpcao => item !== null);
	} catch {
		return [];
	}
}

async function lerCacheAsync(): Promise<TerminalPdvOpcao[]> {
	return parseCacheTerminais(await getConfig(CHAVE_CACHE_TERMINAIS_PDV, "[]"));
}

export async function atualizarCacheTerminaisPdv(): Promise<
	TerminalPdvOpcao[]
> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.token) {
		return lerCacheAsync();
	}

	const remoto = await listarTerminaisPdv(sessao.idempresa);
	const lista = remoto
		.filter((item) => item.ativo)
		.map((item) => ({
			numeropdv: item.numeropdv,
			descricao: item.descricao?.trim() ? item.descricao.trim() : null,
		}))
		.sort((a, b) => a.numeropdv - b.numeropdv);

	await setConfig(CHAVE_CACHE_TERMINAIS_PDV, JSON.stringify(lista));
	return lista;
}

export async function obterTerminaisPdvLocais(): Promise<TerminalPdvOpcao[]> {
	try {
		return await atualizarCacheTerminaisPdv();
	} catch {
		return lerCacheAsync();
	}
}
