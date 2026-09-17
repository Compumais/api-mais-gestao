import { v4 as uuidv4 } from "uuid";
import type { NovaEntidade } from "@/model/entidade-model.js";
import { listarDocumentosEntidadesEmpresa } from "@/repositories/entidade-repositories.js";
import { sanitizarDadosEntidade } from "@/service/entidades/criar-entidade.js";
import type {
	EntidadeImportacaoArquivo,
	ResultadoValidacaoImportacaoEntidades,
} from "@/util/entidades-importacao.js";

export type TipoImportacaoEntidade = "cliente" | "fornecedor";

export type EntidadeImportacaoResolvida = EntidadeImportacaoArquivo & {
	acao: "criar" | "atualizar";
	idExistente: string | null;
	dados: NovaEntidade;
};

function normalizarDocumento(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

function agoraIso(): string {
	return new Date().toISOString();
}

function montarDados(
	idempresa: string,
	entidade: EntidadeImportacaoArquivo,
	tipo: TipoImportacaoEntidade,
	idExistente: string | null,
): NovaEntidade {
	const agora = agoraIso();
	return sanitizarDadosEntidade({
		id: idExistente ?? uuidv4(),
		idempresa,
		nome: entidade.nome,
		cnpjcpf: entidade.cnpjcpf,
		razaosocial: entidade.razaosocial,
		tipopessoa: entidade.tipopessoa,
		indiedest: entidade.indiedest,
		inscricaoestadual: entidade.inscricaoestadual,
		rg: entidade.rg,
		email: entidade.email,
		telefone: entidade.telefone,
		endereco: entidade.endereco,
		numeroendereco: entidade.numeroendereco,
		complemento: entidade.complemento,
		bairro: entidade.bairro,
		cep: entidade.cep,
		fax: entidade.fax,
		nascimento: entidade.nascimento,
		pais: entidade.pais,
		cliente: tipo === "cliente" ? 1 : 0,
		fornecedor: tipo === "fornecedor" ? 1 : 0,
		transportador: 0,
		representante: 0,
		criadoem: agora,
		atualizadoem: agora,
	});
}

export async function resolverImportacaoEntidades(params: {
	idempresa: string;
	tipo: TipoImportacaoEntidade;
	validacao: ResultadoValidacaoImportacaoEntidades;
}): Promise<EntidadeImportacaoResolvida[]> {
	const existentes = await listarDocumentosEntidadesEmpresa(params.idempresa);
	const porDocumento = new Map<string, string>();

	for (const existente of existentes) {
		const documento = normalizarDocumento(existente.cnpjcpf);
		if (documento && !porDocumento.has(documento)) {
			porDocumento.set(documento, existente.id);
		}
	}

	return params.validacao.entidades.map((entidade) => {
		const idExistente = entidade.documento
			? (porDocumento.get(entidade.documento) ?? null)
			: null;

		return {
			...entidade,
			acao: idExistente ? "atualizar" : "criar",
			idExistente,
			dados: montarDados(params.idempresa, entidade, params.tipo, idExistente),
		};
	});
}
