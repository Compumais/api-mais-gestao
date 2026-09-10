import { baixarTabelaIbptPorUf, IbptApiError } from "@/lib/ibpt-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarUltimaImportacaoIbptPorUf,
	contarAliquotasIbptPorUf,
	registrarImportacaoIbpt,
	substituirAliquotasIbptPorUf,
} from "@/repositories/ibpt-repositories.js";
import { httpBadGateway, httpBadRequest, httpOk } from "@/util/http-util.js";
import { parsearArquivoIbpt } from "@/util/parsear-arquivo-ibpt.js";

type ImportarTabelaIbptParametros = {
	uf: string;
	idusuario?: string;
};

export async function importarTabelaIbptService({
	uf,
	idusuario,
}: ImportarTabelaIbptParametros): Promise<
	HttpResponse<{
		uf: string;
		chave: string;
		fonte: string;
		versao?: string;
		quantidadeRegistros: number;
	}>
> {
	try {
		const respostaApi = await baixarTabelaIbptPorUf(uf);
		const parseado = parsearArquivoIbpt(respostaApi, uf);

		await substituirAliquotasIbptPorUf(
			parseado.uf,
			parseado.registros.map((registro) => ({
				uf: parseado.uf,
				ncm: registro.ncm,
				ex: registro.ex,
				aliquotaNacional: String(registro.aliquotaNacional),
				aliquotaImportado: String(registro.aliquotaImportado),
				aliquotaEstadual: String(registro.aliquotaEstadual),
				aliquotaMunicipal: String(registro.aliquotaMunicipal),
				chave: registro.chave,
				fonte: registro.fonte,
				versao: registro.versao ?? parseado.versao ?? null,
				vigenciaInicio: registro.vigenciaInicio ?? null,
				vigenciaFim: registro.vigenciaFim ?? null,
			})),
		);

		await registrarImportacaoIbpt({
			uf: parseado.uf,
			chave: parseado.chave,
			versao: parseado.versao,
			fonte: parseado.fonte,
			quantidadeRegistros: parseado.registros.length,
			idusuario,
		});

		return httpOk({
			uf: parseado.uf,
			chave: parseado.chave,
			fonte: parseado.fonte,
			versao: parseado.versao,
			quantidadeRegistros: parseado.registros.length,
		});
	} catch (error) {
		if (error instanceof IbptApiError) {
			return httpBadGateway(error.message);
		}
		return httpBadRequest(
			error instanceof Error
				? error.message
				: "Falha ao sincronizar tabela IBPT",
		);
	}
}

export async function statusTabelaIbptService(uf: string): Promise<
	HttpResponse<{
		uf: string;
		importado: boolean;
		chave?: string;
		fonte?: string;
		versao?: string;
		quantidadeRegistros: number;
		importadoEm?: string;
	}>
> {
	const ufNormalizada = uf.trim().toUpperCase();
	if (ufNormalizada.length !== 2) {
		return httpBadRequest("UF inválida");
	}

	const quantidadeRegistros = await contarAliquotasIbptPorUf(ufNormalizada);
	const ultima = await buscarUltimaImportacaoIbptPorUf(ufNormalizada);

	return httpOk({
		uf: ufNormalizada,
		importado: quantidadeRegistros > 0,
		chave: ultima?.chave ?? undefined,
		fonte: ultima?.fonte ?? undefined,
		versao: ultima?.versao ?? undefined,
		quantidadeRegistros,
		importadoEm: ultima?.importadoEm ?? undefined,
	});
}
