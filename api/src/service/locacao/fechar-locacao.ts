import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { Locacao } from "@/model/locacao-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarLocacaoPorIdEempresa,
	listarItensLocacao,
	persistirFechamentoLocacao,
} from "@/repositories/locacao-repositories.js";
import { buscarPlanoContasPorId } from "@/repositories/plano-contas-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { calcularFechamentoLocacao } from "@/service/locacao/calcular-fechamento-locacao.js";
import { TIPO_ORIGEM_FINANCEIRO_LOCACAO } from "@/util/contrato-constants.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { dataIsoValida, diferencaDiasIso } from "@/util/locacao-calculo.js";
import { ErroNegocioLocacao } from "@/util/locacao-erro.js";

type FecharLocacaoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
	datadevolucao: string;
	formapagamento: "prazo" | "avista";
	idplanocontas: string;
	idtipodocumento?: string | null;
	vencimento?: string | null;
	idcontacorrente?: string | null;
};

export async function fecharLocacaoService(
	parametros: FecharLocacaoParametros,
): Promise<HttpResponse<Locacao | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();
	if (!dataIsoValida(parametros.datadevolucao)) {
		return httpBadRequest("Data de devolução inválida");
	}

	const atual = await buscarLocacaoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!atual) return httpNaoEncontrado("Locação não encontrada");
	if (atual.locacao.situacao !== "aberta") {
		return httpBadRequest("Somente locação aberta pode ser fechada");
	}
	if (
		diferencaDiasIso(atual.locacao.datainicio, parametros.datadevolucao) < 0
	) {
		return httpBadRequest("Data de devolução anterior ao início da locação");
	}

	const plano = await buscarPlanoContasPorId(parametros.idplanocontas);
	if (!plano || plano.idempresa !== parametros.idempresa) {
		return httpBadRequest("Plano de contas não encontrado");
	}

	const cliente = await buscarEntidadePorId(atual.locacao.identidade);
	if (!cliente) return httpBadRequest("Cliente da locação não encontrado");

	let vencimento: string | null = null;
	let idtipodocumento: string | null = null;
	let idcontacorrente: string | null = null;
	if (parametros.formapagamento === "prazo") {
		if (!parametros.idtipodocumento) {
			return httpBadRequest("Informe o tipo de documento");
		}
		if (!parametros.vencimento || !dataIsoValida(parametros.vencimento)) {
			return httpBadRequest("Informe o vencimento");
		}
		const tipo = await buscarTipoDocumentoFinanceiroPorId(
			parametros.idtipodocumento,
		);
		if (!tipo || tipo.idempresa !== parametros.idempresa) {
			return httpBadRequest("Tipo de documento não encontrado");
		}
		vencimento = parametros.vencimento;
		idtipodocumento = tipo.id;
	} else {
		if (!parametros.idcontacorrente) {
			return httpBadRequest("Informe o caixa ou a conta corrente");
		}
		const conta = await buscarContaCorrentePorId({
			id: parametros.idcontacorrente,
		});
		if (!conta || conta.idempresa !== parametros.idempresa) {
			return httpBadRequest("Conta corrente não encontrada");
		}
		idcontacorrente = conta.id;
	}

	const itens = await listarItensLocacao(atual.locacao.id);
	const previa = calcularFechamentoLocacao({
		datainicio: atual.locacao.datainicio,
		datadevolucao: parametros.datadevolucao,
		itens,
	});
	const valor = Number(previa.valortotal);
	const nomeCliente =
		cliente.razaosocial?.trim() || cliente.nome?.trim() || "Cliente";
	const documento = `LOC ${atual.locacao.codigo}`.slice(0, 60);
	const historico = `Locação ${atual.locacao.codigo} — ${nomeCliente}`.slice(
		0,
		500,
	);
	const idfinanceiro = parametros.formapagamento === "prazo" ? uuidv4() : null;

	try {
		const registro = await persistirFechamentoLocacao({
			id: atual.locacao.id,
			datadevolucao: parametros.datadevolucao,
			formapagamento: parametros.formapagamento,
			valorperiodo: previa.valorperiodo,
			valormora: previa.valormora,
			valortotal: previa.valortotal,
			vencimento,
			idtipodocumento,
			idplanocontas: plano.id,
			idcontacorrente,
			idfinanceiro,
			itens: previa.itens.map((item) => ({
				id: item.id,
				diasatraso: item.diasatraso,
				valormora: item.valormora,
				valortotal: item.valortotal,
			})),
			idsEquipamentos: itens.map((item) => item.item.idequipamento),
			financeiro:
				parametros.formapagamento === "prazo" && idfinanceiro
					? {
							id: idfinanceiro,
							idempresa: parametros.idempresa,
							identidade: atual.locacao.identidade,
							tipo: "R",
							tipoorigem: TIPO_ORIGEM_FINANCEIRO_LOCACAO,
							idorigem: atual.locacao.id,
							parcela: 1,
							totalparcelas: 1,
							documento,
							emitente: nomeCliente.slice(0, 60),
							cnpjcpfemitente: cliente.cnpjcpf ?? null,
							idtipodocumentofinanceiro: idtipodocumento,
							idplanocontas: plano.id,
							status: "A",
							emissao: parametros.datadevolucao,
							vencimento,
							vencimentooriginal: vencimento,
							valor: previa.valortotal,
							saldo: previa.valortotal,
							historico,
							registro: new Date().toISOString(),
							currenttimemillis: Date.now(),
						}
					: null,
			lancamento:
				parametros.formapagamento === "avista" && idcontacorrente && valor > 0
					? {
							idcontacorrente,
							idusuario: parametros.idusuario,
							idplanocontas: plano.id,
							valor,
							historico,
							documento,
							datahora: parametros.datadevolucao,
						}
					: null,
		});

		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "fechar_locacao",
			idusuario: parametros.idusuario,
			recurso: "locacao",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: new Date().toISOString(),
			metadados: {
				codigo: registro.codigo,
				formapagamento: parametros.formapagamento,
				valortotal: previa.valortotal,
				valormora: previa.valormora,
			},
		});
		if (!auditoria.success) return httpErroInterno();
		return httpOk(registro);
	} catch (error) {
		if (error instanceof ErroNegocioLocacao)
			return httpBadRequest(error.message);
		throw error;
	}
}
