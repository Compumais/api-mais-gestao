import type { HttpResponse } from "@/model/http-model.js";
import {
	contarAliquotasIbptPorUf,
	buscarUltimaImportacaoIbptPorUf,
	registrarImportacaoIbpt,
	substituirAliquotasIbptPorUf,
} from "@/repositories/ibpt-repositories.js";
import { parsearArquivoIbpt } from "@/util/parsear-arquivo-ibpt.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

type ImportarTabelaIbptParametros = {
	conteudo: unknown;
	uf?: string;
	idusuario?: string;
};

export async function importarTabelaIbptService({
	conteudo,
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
		const parseado = parsearArquivoIbpt(conteudo, uf);

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
		return httpBadRequest(
			error instanceof Error ? error.message : "Falha ao importar tabela IBPT",
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
