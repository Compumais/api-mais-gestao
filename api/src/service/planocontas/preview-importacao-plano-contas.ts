import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarVinculosPlanoContasPorEmpresa,
	type VinculoPlanoContas,
} from "@/repositories/plano-contas-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	type ContaImportacaoPlanoContas,
	type FormatoArquivoImportacao,
	validarArquivoImportacaoPlanoContas,
} from "@/util/plano-contas-importacao.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

type PreviewImportacaoPlanoContasParametros = {
	idempresa: string;
	idusuario: string;
	roles: string | string[];
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
};

type PreviewImportacaoPlanoContasResposta = {
	totalContas: number;
	totalErros: number;
	errosGerais: string[];
	contas: ContaImportacaoPlanoContas[];
	vinculos: {
		possui: boolean;
		detalhes: VinculoPlanoContas[];
	};
};

export function validarExtensaoArquivo(
	formato: FormatoArquivoImportacao,
	nomeArquivo: string | undefined,
): string | null {
	if (!nomeArquivo) {
		return null;
	}

	const extensaoEsperada = `.${formato}`;

	if (!nomeArquivo.toLowerCase().endsWith(extensaoEsperada)) {
		return `Extensão inválida: o arquivo "${nomeArquivo}" não é um arquivo ${extensaoEsperada}.`;
	}

	return null;
}

export async function previewImportacaoPlanoContasService({
	idempresa,
	idusuario,
	roles,
	formato,
	conteudo,
	nomeArquivo,
}: PreviewImportacaoPlanoContasParametros): Promise<
	HttpResponse<PreviewImportacaoPlanoContasResposta>
> {
	const temPermissao = verificarPermissao(roles, [
		"proprietario",
		"financeiro",
	]);

	if (!temPermissao) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroExtensao = validarExtensaoArquivo(formato, nomeArquivo);

	if (erroExtensao) {
		return httpOk<PreviewImportacaoPlanoContasResposta>({
			totalContas: 0,
			totalErros: 0,
			errosGerais: [erroExtensao],
			contas: [],
			vinculos: { possui: false, detalhes: [] },
		});
	}

	const [validacao, vinculos] = await Promise.all([
		validarArquivoImportacaoPlanoContas(formato, conteudo),
		buscarVinculosPlanoContasPorEmpresa(idempresa),
	]);

	return httpOk<PreviewImportacaoPlanoContasResposta>({
		totalContas: validacao.totalContas,
		totalErros: validacao.totalErros,
		errosGerais: validacao.errosGerais,
		contas: validacao.contas,
		vinculos: {
			possui: vinculos.length > 0,
			detalhes: vinculos,
		},
	});
}
