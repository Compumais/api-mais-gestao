import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEntidade,
	buscarEntidadePorId,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { sanitizarDadosEntidade } from "@/service/entidades/criar-entidade.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";
import { extrairMensagemErroBanco } from "@/util/texto-util.js";

type AtualizarEntidadeParametros = {
	entidadeId: string;
	idusuario: string;
	dados: {
		nome?: string | undefined;
		cnpjcpf?: string | undefined;
		razaosocial?: string | null | undefined;
		tipopessoa?: number | null | undefined;
		inscricaoestadual?: string | null | undefined;
		rg?: string | null | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		numeroendereco?: string | null | undefined;
		complemento?: string | null | undefined;
		bairro?: string | null | undefined;
		idcidade?: string | null | undefined;
		idestado?: string | null | undefined;
		cep?: string | null | undefined;
		fax?: string | null | undefined;
		nascimento?: string | null | undefined;
		idplanocontas?: string | null | undefined;
		pais?: string | null | undefined;
		cliente?: number | undefined;
		fornecedor?: number | undefined;
		transportador?: number | undefined;
		representante?: number | undefined;
		indiedest?: number | null | undefined;
	};
};

export async function atualizarEntidadeService({
	entidadeId,
	idusuario,
	dados,
}: AtualizarEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
	const entidadeExistente = await buscarEntidadePorId(entidadeId);

	if (!entidadeExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		entidadeExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dados.email || dados.telefone) {
		const emailOuTelefoneDuplicado = await verificarEmailTelefoneDuplicado(
			entidadeExistente.idempresa,
			dados.email ?? entidadeExistente.email,
			dados.telefone ?? entidadeExistente.telefone,
			entidadeId,
		);

		if (emailOuTelefoneDuplicado) {
			return httpRecursoExistente();
		}
	}

	const dadosSanitizados = sanitizarDadosEntidade({
		...entidadeExistente,
		...dados,
		id: entidadeExistente.id,
		idempresa: entidadeExistente.idempresa,
		cnpjcpf: dados.cnpjcpf ?? entidadeExistente.cnpjcpf,
		nome: dados.nome ?? entidadeExistente.nome,
		criadoem: entidadeExistente.criadoem,
		atualizadoem: new Date().toISOString(),
	});

	const payloadUpdate: AtualizarEntidadeParametros["dados"] & {
		atualizadoem: string;
	} = {
		atualizadoem: dadosSanitizados.atualizadoem,
	};

	if (dados.nome !== undefined) payloadUpdate.nome = dadosSanitizados.nome;
	if (dados.cnpjcpf !== undefined) payloadUpdate.cnpjcpf = dadosSanitizados.cnpjcpf;
	if (dados.razaosocial !== undefined) {
		payloadUpdate.razaosocial = dadosSanitizados.razaosocial;
	}
	if (dados.tipopessoa !== undefined) payloadUpdate.tipopessoa = dados.tipopessoa;
	if (dados.inscricaoestadual !== undefined) {
		payloadUpdate.inscricaoestadual = dadosSanitizados.inscricaoestadual;
	}
	if (dados.rg !== undefined) payloadUpdate.rg = dadosSanitizados.rg;
	if (dados.email !== undefined) payloadUpdate.email = dadosSanitizados.email;
	if (dados.telefone !== undefined) {
		payloadUpdate.telefone = dadosSanitizados.telefone;
	}
	if (dados.endereco !== undefined) {
		payloadUpdate.endereco = dadosSanitizados.endereco;
	}
	if (dados.numeroendereco !== undefined) {
		payloadUpdate.numeroendereco = dadosSanitizados.numeroendereco;
	}
	if (dados.complemento !== undefined) {
		payloadUpdate.complemento = dadosSanitizados.complemento;
	}
	if (dados.bairro !== undefined) payloadUpdate.bairro = dadosSanitizados.bairro;
	if (dados.idcidade !== undefined) {
		payloadUpdate.idcidade = dadosSanitizados.idcidade;
	}
	if (dados.idestado !== undefined) {
		payloadUpdate.idestado = dadosSanitizados.idestado;
	}
	if (dados.cep !== undefined) payloadUpdate.cep = dadosSanitizados.cep;
	if (dados.fax !== undefined) payloadUpdate.fax = dadosSanitizados.fax;
	if (dados.nascimento !== undefined) {
		payloadUpdate.nascimento = dadosSanitizados.nascimento;
	}
	if (dados.idplanocontas !== undefined) {
		payloadUpdate.idplanocontas = dadosSanitizados.idplanocontas;
	}
	if (dados.pais !== undefined) payloadUpdate.pais = dadosSanitizados.pais;
	if (dados.cliente !== undefined) payloadUpdate.cliente = dados.cliente;
	if (dados.fornecedor !== undefined) payloadUpdate.fornecedor = dados.fornecedor;
	if (dados.transportador !== undefined) {
		payloadUpdate.transportador = dados.transportador;
	}
	if (dados.representante !== undefined) {
		payloadUpdate.representante = dados.representante;
	}
	if (dados.indiedest !== undefined) payloadUpdate.indiedest = dados.indiedest;

	try {
		const entidadeAtualizado = await atualizarEntidade(
			entidadeId,
			payloadUpdate,
		);

		if (!entidadeAtualizado) {
			return httpNaoEncontrado();
		}

		return httpOk<Entidade>(entidadeAtualizado);
	} catch (erro) {
		console.error("Erro ao atualizar entidade:", erro);
		return httpBadRequest(extrairMensagemErroBanco(erro));
	}
}
