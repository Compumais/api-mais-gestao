import { randomUUID } from "node:crypto";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoPlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarVinculosPlanoContasPorEmpresa,
	substituirPlanoContasPorEmpresa,
} from "@/repositories/plano-contas-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoPlanoContas,
} from "@/util/plano-contas-importacao.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";
import { validarExtensaoArquivo } from "./preview-importacao-plano-contas.js";

type ImportarPlanoContasParametros = {
	idempresa: string;
	idusuario: string;
	roles: string | string[];
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
};

type ImportarPlanoContasResposta = {
	totalImportadas: number;
	totalRemovidas: number;
};

export async function importarPlanoContasService({
	idempresa,
	idusuario,
	roles,
	formato,
	conteudo,
	nomeArquivo,
}: ImportarPlanoContasParametros): Promise<
	HttpResponse<ImportarPlanoContasResposta>
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
		return {
			success: false,
			status: 400,
			error: erroExtensao,
			code: "PLANO_CONTAS_IMPORTACAO_EXTENSAO_INVALIDA",
		};
	}

	const validacao = await validarArquivoImportacaoPlanoContas(
		formato,
		conteudo,
	);

	if (validacao.errosGerais.length > 0) {
		return {
			success: false,
			status: 400,
			error: validacao.errosGerais.join(" "),
			code: "PLANO_CONTAS_IMPORTACAO_ARQUIVO_INVALIDO",
		};
	}

	if (validacao.totalErros > 0) {
		return {
			success: false,
			status: 400,
			error: `O arquivo possui ${validacao.totalErros} erro(s) de validação. Corrija o arquivo e tente novamente.`,
			code: "PLANO_CONTAS_IMPORTACAO_ERROS_VALIDACAO",
		};
	}

	const vinculos = await buscarVinculosPlanoContasPorEmpresa(idempresa);

	if (vinculos.length > 0) {
		const detalhes = vinculos
			.map((vinculo) => `${vinculo.tabela}: ${vinculo.quantidade}`)
			.join("; ");

		return {
			success: false,
			status: 409,
			error: `Não é possível substituir o plano de contas pois existem registros vinculados às contas atuais (${detalhes}). Remova os vínculos antes de importar.`,
			code: "PLANO_CONTAS_IMPORTACAO_COM_VINCULOS",
		};
	}

	// Insere pais antes dos filhos: as contas já vêm ordenadas por código hierárquico
	const idPorCodigo = new Map<string, string>();

	for (const conta of validacao.contas) {
		idPorCodigo.set(conta.codigo, randomUUID());
	}

	const dadosPlanoContas: NovoPlanoContas[] = validacao.contas.map((conta) => ({
		id: idPorCodigo.get(conta.codigo) as string,
		idempresa,
		codigo: conta.codigo,
		nome: conta.nome,
		tipomovimento: conta.tipomovimento,
		inativo: conta.inativo,
		idplanocontas: conta.codigoPai
			? (idPorCodigo.get(conta.codigoPai) ?? null)
			: null,
		currenttimemillis: Date.now(),
	}));

	const { excluidos, inseridos } = await substituirPlanoContasPorEmpresa(
		idempresa,
		dadosPlanoContas,
	);

	await criarAuditoriaService({
		id: randomUUID(),
		acao: "Importar Plano de Contas",
		idusuario,
		recurso: "Plano de Contas",
		idrecurso: idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idempresa,
			formato,
			nomeArquivo: nomeArquivo ?? null,
			totalImportadas: inseridos,
			totalRemovidas: excluidos,
		},
	});

	return httpOk<ImportarPlanoContasResposta>({
		totalImportadas: inseridos,
		totalRemovidas: excluidos,
	});
}
