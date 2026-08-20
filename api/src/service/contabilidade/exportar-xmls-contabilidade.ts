import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarNotasParaExportacaoXmlContabilidade } from "@/repositories/nota-fiscal-repositories.js";
import { montarArquivosXmlContabilidade } from "@/service/contabilidade/montar-arquivos-xml-contabilidade.js";
import { compactarXmlsFiscais } from "@/util/compactar-xmls-fiscais.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ExportarXmlsContabilidadeParametros = {
	idusuario: string;
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

export type ExportarXmlsContabilidadeResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
	resumo: {
		totalNfe: number;
		totalNfce: number;
		totalNfeCanceladas: number;
		totalNfceCanceladas: number;
	};
};

const PERIODO_MAXIMO_DIAS = 365;

function validarPeriodo(dataInicio: string, dataFim: string): string | null {
	const inicio = new Date(dataInicio);
	const fim = new Date(dataFim);

	if (inicio > fim) {
		return "Data inicial não pode ser maior que data final";
	}

	const diffTime = Math.abs(fim.getTime() - inicio.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays > PERIODO_MAXIMO_DIAS) {
		return `Período máximo permitido é de ${PERIODO_MAXIMO_DIAS} dias`;
	}

	return null;
}

async function montarNomeArquivoZip(
	idempresa: string,
	dataInicio: string,
	dataFim: string,
): Promise<string> {
	const empresa = await buscarEmpresaPorId(idempresa);
	const identificador = empresa?.cnpj?.replace(/\D/g, "") || idempresa.slice(0, 8);
	return `xmls-fiscais-${identificador}-${dataInicio}-${dataFim}.zip`;
}

export async function exportarXmlsContabilidadeService({
	idusuario,
	idempresa,
	dataInicio,
	dataFim,
}: ExportarXmlsContabilidadeParametros): Promise<
	HttpResponse<ExportarXmlsContabilidadeResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroPeriodo = validarPeriodo(dataInicio, dataFim);
	if (erroPeriodo) {
		return httpBadRequest(erroPeriodo);
	}

	const notas = await listarNotasParaExportacaoXmlContabilidade({
		idempresa,
		dataInicio,
		dataFim,
	});

	const arquivos = await montarArquivosXmlContabilidade(notas);

	if (arquivos.length === 0) {
		return httpBadRequest(
			"Nenhum XML encontrado para o período informado",
		);
	}

	const content = await compactarXmlsFiscais(arquivos);
	const filename = await montarNomeArquivoZip(idempresa, dataInicio, dataFim);

	const totalNfe = arquivos.filter(
		(arquivo) => arquivo.pasta === "nfe" && !arquivo.subpasta,
	).length;
	const totalNfce = arquivos.filter(
		(arquivo) => arquivo.pasta === "nfce" && !arquivo.subpasta,
	).length;
	const totalNfeCanceladas = arquivos.filter(
		(arquivo) => arquivo.pasta === "nfe" && arquivo.subpasta === "canceladas",
	).length;
	const totalNfceCanceladas = arquivos.filter(
		(arquivo) => arquivo.pasta === "nfce" && arquivo.subpasta === "canceladas",
	).length;

	return httpOk({
		content,
		contentType: "application/zip",
		filename,
		resumo: { totalNfe, totalNfce, totalNfeCanceladas, totalNfceCanceladas },
	});
}
