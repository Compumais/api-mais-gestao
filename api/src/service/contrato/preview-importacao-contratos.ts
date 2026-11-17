import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { resolverContratosImportacao } from "@/service/contrato/resolver-importacao-contratos.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoContratos,
	validarExtensaoArquivoContratos,
} from "@/util/contratos-importacao.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type PreviewImportacaoContratosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
	idtipodocumento: string;
};

export type ContratoPreviewImportacao = {
	linha: number;
	codigocliente: string;
	nomeCliente: string | null;
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string | null;
	diavencimento: number | null;
	criarGrupo: boolean;
	criarTipo: boolean;
	acao: "criar";
	erros: string[];
};

export type PreviewImportacaoContratosResposta = {
	totalContratos: number;
	totalCriar: number;
	totalGruposNovos: number;
	totalTiposNovos: number;
	totalErros: number;
	errosGerais: string[];
	contratos: ContratoPreviewImportacao[];
};

export async function previewImportacaoContratosService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
	idtipodocumento,
}: PreviewImportacaoContratosParametros): Promise<
	HttpResponse<PreviewImportacaoContratosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const tipoDocumento =
		await buscarTipoDocumentoFinanceiroPorId(idtipodocumento);
	if (!tipoDocumento || tipoDocumento.idempresa !== idempresa) {
		return {
			success: false,
			status: 400,
			error: "Tipo de documento financeiro inválido",
			code: "CONTRATOS_IMPORTACAO_TIPO_DOCUMENTO_INVALIDO",
		};
	}

	const erroExtensao = validarExtensaoArquivoContratos(formato, nomeArquivo);
	if (erroExtensao) {
		return {
			success: false,
			status: 400,
			error: erroExtensao,
			code: "CONTRATOS_IMPORTACAO_EXTENSAO_INVALIDA",
		};
	}

	const validacao = await validarArquivoImportacaoContratos(formato, conteudo);

	if (validacao.errosGerais.length > 0) {
		return httpOk({
			totalContratos: validacao.totalContratos,
			totalCriar: 0,
			totalGruposNovos: 0,
			totalTiposNovos: 0,
			totalErros: validacao.totalErros,
			errosGerais: validacao.errosGerais,
			contratos: [],
		});
	}

	const resolvidos = await resolverContratosImportacao({
		idempresa,
		validacao,
	});

	const totalErros = resolvidos.reduce(
		(total, item) => total + item.erros.length,
		0,
	);
	const gruposNovos = new Set(
		resolvidos
			.filter((item) => item.criarGrupo && item.descricaoGrupo)
			.map((item) => item.descricaoGrupo as string),
	);
	const tiposNovos = new Set(
		resolvidos
			.filter((item) => item.criarTipo && item.descricaoTipo)
			.map((item) => item.descricaoTipo as string),
	);

	return httpOk({
		totalContratos: resolvidos.length,
		totalCriar: resolvidos.filter((item) => item.erros.length === 0).length,
		totalGruposNovos: gruposNovos.size,
		totalTiposNovos: tiposNovos.size,
		totalErros,
		errosGerais: [],
		contratos: resolvidos.map((item) => ({
			linha: item.linha,
			codigocliente: item.codigocliente,
			nomeCliente: item.nomeCliente,
			grupocontrato: item.grupocontrato,
			tipocontrato: item.tipocontrato,
			descricao: item.descricao,
			valor: item.valor,
			diavencimento: item.diavencimento,
			criarGrupo: item.criarGrupo,
			criarTipo: item.criarTipo,
			acao: "criar" as const,
			erros: item.erros,
		})),
	});
}
