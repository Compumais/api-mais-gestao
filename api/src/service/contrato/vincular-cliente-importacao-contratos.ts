import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEntidade,
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	persistirImportacaoContratos,
	resolverContratosImportacao,
} from "@/service/contrato/resolver-importacao-contratos.js";
import { criarEntidadeService } from "@/service/entidades/criar-entidade.js";
import type { ResultadoValidacaoImportacaoContratos } from "@/util/contratos-importacao.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ContratoVinculo = {
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string;
	diavencimento: number;
};

type VincularClienteImportacaoParametros = {
	idempresa: string;
	idusuario: string;
	idtipodocumento: string;
	acao: "cadastrar" | "associar";
	codigocliente: string;
	nome?: string | undefined;
	identidade?: string | undefined;
	contratos: ContratoVinculo[];
};

export type VincularClienteImportacaoResposta = {
	identidade: string;
	nomeCliente: string;
	totalCriados: number;
	totalGruposCriados: number;
	totalTiposCriados: number;
};

function tipopessoaPorDocumento(documento: string): number | null {
	const digitos = documento.replace(/\D/g, "");
	if (digitos.length === 14) return 1;
	if (digitos.length === 11) return 0;
	return null;
}

export async function vincularClienteImportacaoContratosService({
	idempresa,
	idusuario,
	idtipodocumento,
	acao,
	codigocliente,
	nome,
	identidade,
	contratos,
}: VincularClienteImportacaoParametros): Promise<
	HttpResponse<VincularClienteImportacaoResposta>
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
		return httpBadRequest("Tipo de documento financeiro inválido");
	}

	let identidadeVinculo = identidade ?? "";
	let nomeCliente = nome?.trim() ?? "";

	if (acao === "cadastrar") {
		const documento = codigocliente.trim().slice(0, 20);
		if (!documento) {
			return httpBadRequest("Informe o documento do cliente");
		}
		if (!nomeCliente) {
			return httpBadRequest("Informe o nome do cliente");
		}

		const agora = new Date().toISOString();
		const criado = await criarEntidadeService({
			idusuario,
			dadosEntidade: {
				id: uuidv4(),
				idempresa,
				nome: nomeCliente,
				cnpjcpf: documento,
				tipopessoa: tipopessoaPorDocumento(documento),
				cliente: 1,
				fornecedor: 0,
				transportador: 0,
				representante: 0,
				criadoem: agora,
				atualizadoem: agora,
			},
		});

		if (!criado.success) {
			return criado;
		}
		if (!criado.body) {
			return httpBadRequest("Não foi possível cadastrar o cliente");
		}

		identidadeVinculo = criado.body.id;
		nomeCliente = criado.body.nome;
	} else {
		if (!identidadeVinculo) {
			return httpBadRequest("Selecione o cliente para associar");
		}

		const entidade = await buscarEntidadePorId(identidadeVinculo);
		if (!entidade || entidade.idempresa !== idempresa) {
			return httpNaoEncontrado("Cadastro não encontrado nesta empresa");
		}

		if (Number(entidade.cliente) !== 1) {
			const atualizada = await atualizarEntidade(entidade.id, {
				cliente: 1,
				atualizadoem: new Date().toISOString(),
			});
			if (!atualizada) {
				return httpBadRequest(
					"Não foi possível marcar o cadastro como cliente",
				);
			}
		}

		nomeCliente = entidade.nome;
	}

	const validacao: ResultadoValidacaoImportacaoContratos = {
		contratos: contratos.map((item, indice) => ({
			linha: indice + 2,
			codigocliente: identidadeVinculo,
			grupocontrato: item.grupocontrato,
			tipocontrato: item.tipocontrato,
			descricao: item.descricao,
			valor: item.valor,
			diavencimento: item.diavencimento,
			erros: [],
		})),
		totalContratos: contratos.length,
		totalErros: 0,
		errosGerais: [],
	};

	const resolvidos = await resolverContratosImportacao({
		idempresa,
		validacao,
	});

	const erros = resolvidos.flatMap((item) => item.erros);
	if (erros.length > 0 || resolvidos.some((item) => !item.identidade)) {
		return httpBadRequest(
			erros[0] ?? "Não foi possível vincular o cliente aos contratos",
		);
	}

	const persistido = await persistirImportacaoContratos({
		idempresa,
		idtipodocumento,
		resolvidos,
	});

	const agora = new Date().toISOString();
	await criarAuditoriaService({
		id: uuidv4(),
		acao: "vincular_cliente_importacao_contratos",
		idusuario,
		recurso: "contrato",
		idrecurso: identidadeVinculo,
		idempresa,
		criadoem: agora,
		metadados: {
			acao,
			codigocliente,
			totalCriados: persistido.criados,
			totalGruposCriados: persistido.gruposCriados,
			totalTiposCriados: persistido.tiposCriados,
		},
	});

	return httpOk({
		identidade: identidadeVinculo,
		nomeCliente,
		totalCriados: persistido.criados,
		totalGruposCriados: persistido.gruposCriados,
		totalTiposCriados: persistido.tiposCriados,
	});
}
