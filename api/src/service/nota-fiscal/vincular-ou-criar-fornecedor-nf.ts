import { v4 as uuidv4 } from "uuid";
import {
	atualizarEntidade,
	buscarEntidadePorCnpj,
	buscarEntidadePorId,
	criarEntidade,
} from "@/repositories/entidade-repositories.js";
import { truncarTexto } from "@/util/texto-util.js";

export type DadosFornecedorNf = {
	idempresa: string;
	identidade?: string | null | undefined;
	cnpj?: string | null | undefined;
	razaosocial?: string | null | undefined;
	inscricaoestadual?: string | null | undefined;
};

function normalizarCnpjCpf(cnpj?: string | null): string | null {
	if (!cnpj) return null;

	const digitos = cnpj.replace(/\D/g, "");
	return digitos.length > 0 ? digitos : null;
}

function inferirTipoPessoa(cnpjCpf: string): number {
	return cnpjCpf.length > 11 ? 1 : 0;
}

async function garantirFornecedor(id: string): Promise<void> {
	const entidade = await buscarEntidadePorId(id);

	if (entidade && entidade.fornecedor !== 1) {
		await atualizarEntidade(id, {
			fornecedor: 1,
			atualizadoem: new Date().toISOString(),
		});
	}
}

export async function vincularOuCriarFornecedorNf(
	dados: DadosFornecedorNf,
): Promise<string | null> {
	if (dados.identidade) {
		const entidade = await buscarEntidadePorId(dados.identidade);

		if (entidade && entidade.idempresa === dados.idempresa) {
			await garantirFornecedor(entidade.id);
			return entidade.id;
		}
	}

	const cnpjNormalizado = normalizarCnpjCpf(dados.cnpj);

	if (cnpjNormalizado) {
		const existente = await buscarEntidadePorCnpj(
			dados.idempresa,
			cnpjNormalizado,
		);

		if (existente) {
			await garantirFornecedor(existente.id);
			return existente.id;
		}
	}

	if (!cnpjNormalizado) {
		return dados.identidade ?? null;
	}

	const nome =
		truncarTexto(dados.razaosocial, 60) ?? `Fornecedor ${cnpjNormalizado}`;
	const agora = new Date().toISOString();

	const novaEntidade = await criarEntidade({
		id: uuidv4(),
		idempresa: dados.idempresa,
		nome,
		razaosocial: truncarTexto(dados.razaosocial, 60),
		cnpjcpf: cnpjNormalizado,
		inscricaoestadual: truncarTexto(dados.inscricaoestadual, 20),
		tipopessoa: inferirTipoPessoa(cnpjNormalizado),
		fornecedor: 1,
		cliente: 0,
		transportador: 0,
		representante: 0,
		atualizadoem: agora,
	});

	return novaEntidade?.id ?? null;
}
