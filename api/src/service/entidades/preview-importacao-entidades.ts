import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	resolverImportacaoEntidades,
	type TipoImportacaoEntidade,
} from "@/service/entidades/resolver-importacao-entidades.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoEntidades,
	validarExtensaoArquivoEntidades,
} from "@/util/entidades-importacao.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type PreviewImportacaoEntidadesParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
	tipo: TipoImportacaoEntidade;
};

export type EntidadePreviewImportacao = {
	linha: number;
	nome: string;
	cnpjcpf: string;
	acao: "criar" | "atualizar";
	erros: string[];
};

export type PreviewImportacaoEntidadesResposta = {
	totalEntidades: number;
	totalCriar: number;
	totalAtualizar: number;
	totalErros: number;
	errosGerais: string[];
	entidades: EntidadePreviewImportacao[];
};

export async function previewImportacaoEntidadesService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
	tipo,
}: PreviewImportacaoEntidadesParametros): Promise<
	HttpResponse<PreviewImportacaoEntidadesResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroExtensao = validarExtensaoArquivoEntidades(formato, nomeArquivo);
	if (erroExtensao) {
		return httpBadRequest(erroExtensao);
	}

	const validacao = await validarArquivoImportacaoEntidades(formato, conteudo);

	if (validacao.errosGerais.length > 0) {
		return httpOk({
			totalEntidades: validacao.totalEntidades,
			totalCriar: 0,
			totalAtualizar: 0,
			totalErros: validacao.totalErros,
			errosGerais: validacao.errosGerais,
			entidades: [],
		});
	}

	const resolvidos = await resolverImportacaoEntidades({
		idempresa,
		tipo,
		validacao,
	});

	return httpOk({
		totalEntidades: resolvidos.length,
		totalCriar: resolvidos.filter((item) => item.acao === "criar").length,
		totalAtualizar: resolvidos.filter((item) => item.acao === "atualizar")
			.length,
		totalErros: resolvidos.reduce(
			(total, item) => total + item.erros.length,
			0,
		),
		errosGerais: [],
		entidades: resolvidos.map((item) => ({
			linha: item.linha,
			nome: item.nome,
			cnpjcpf: item.cnpjcpf,
			acao: item.acao,
			erros: item.erros,
		})),
	});
}
