import { v4 as uuidv4 } from "uuid";
import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEntidadePorCnpj } from "@/repositories/entidade-repositories.js";
import { criarEntidadeService } from "@/service/entidades/criar-entidade.js";
import { obterConsultaCnpjEntidade } from "@/service/entidades/consultar-cnpj-entidade.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import { httpRecursoExistente, httpNaoEncontrado } from "@/util/http-util.js";

type CriarEntidadePorCnpjParametros = {
	cnpj: string;
	idempresa: string;
	idusuario: string;
	cliente?: number | undefined;
	fornecedor?: number | undefined;
	transportador?: number | undefined;
	representante?: number | undefined;
	idplanocontas?: string | null | undefined;
	indiedest?: number | null | undefined;
};

function httpCnpjInativo(): HttpResponse<never> {
	return {
		success: false,
		status: 422,
		error: "Pessoa jurídica com situação cadastral inativa",
		code: "CNPJ_INATIVO",
	};
}

export async function criarEntidadePorCnpjService({
	cnpj,
	idempresa,
	idusuario,
	cliente = 0,
	fornecedor = 0,
	transportador = 0,
	representante = 0,
	idplanocontas = null,
	indiedest,
}: CriarEntidadePorCnpjParametros): Promise<HttpResponse<Entidade | null>> {
	const cnpjNormalizado = normalizarCnpj(cnpj);
	const consulta = await obterConsultaCnpjEntidade({
		cnpj: cnpjNormalizado,
		idempresa,
	});

	if (!consulta.success) {
		return consulta as HttpResponse<Entidade | null>;
	}

	if (!consulta.body) {
		return httpNaoEncontrado() as HttpResponse<Entidade | null>;
	}

	const { entidade, extras } = consulta.body;

	if (extras.situacaoCadastral.trim().toLowerCase() !== "ativa") {
		return httpCnpjInativo();
	}

	const existente = await buscarEntidadePorCnpj(idempresa, cnpjNormalizado);
	if (existente) {
		return httpRecursoExistente();
	}

	const agora = new Date().toISOString();

	return criarEntidadeService({
		dadosEntidade: {
			id: uuidv4(),
			idempresa,
			nome: entidade.nome,
			razaosocial: entidade.razaosocial,
			cnpjcpf: entidade.cnpjcpf,
			tipopessoa: entidade.tipopessoa,
			email: entidade.email,
			telefone: entidade.telefone,
			endereco: entidade.endereco,
			numeroendereco: entidade.numeroendereco,
			complemento: entidade.complemento,
			bairro: entidade.bairro,
			cep: entidade.cep,
			idcidade: entidade.idcidade,
			idestado: entidade.idestado,
			indiedest: indiedest ?? entidade.indiedest,
			idplanocontas,
			cliente,
			fornecedor,
			transportador,
			representante,
			criadoem: agora,
			atualizadoem: agora,
		},
		idusuario,
	});
}
