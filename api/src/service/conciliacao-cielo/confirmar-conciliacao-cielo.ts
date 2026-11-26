import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { ConciliacaoCieloItem } from "@/model/conciliacao-cielo-model.js";
import {
	STATUS_CONCILIACAO_CIELO,
	STATUS_CONCILIACAO_CIELO_ITEM,
} from "@/model/conciliacao-cielo-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import {
	atualizarConciliacaoCielo,
	atualizarItemConciliacaoCielo,
	buscarConciliacaoCieloPorIdEempresa,
	listarItensConciliacaoCielo,
} from "@/repositories/conciliacao-cielo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { criarFinanceiroLancamentoService } from "@/service/financeirolancamento/criar-financeiro-lancamento.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ConfirmarParametros = {
	idempresa: string;
	idusuario: string;
	idconciliacao: string;
	idcontacorrente: string;
	idsitens?: string[];
	baixarTitulos?: boolean;
};

export type ResultadoConfirmarConciliacaoCielo = {
	confirmados: number;
	ignorados: number;
	erros: number;
	itens: ConciliacaoCieloItem[];
};

function valorNumero(valor: string | null | undefined) {
	return Math.round(Number(valor ?? 0) * 100) / 100;
}

export async function confirmarConciliacaoCieloService({
	idempresa,
	idusuario,
	idconciliacao,
	idcontacorrente,
	idsitens,
	baixarTitulos = true,
}: ConfirmarParametros): Promise<
	HttpResponse<ResultadoConfirmarConciliacaoCielo>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const conciliacao = await buscarConciliacaoCieloPorIdEempresa(
		idconciliacao,
		idempresa,
	);
	if (!conciliacao) return httpBadRequest("Conciliação não encontrada");

	const conta = await buscarContaCorrentePorId({ id: idcontacorrente });
	if (!conta || conta.idempresa !== idempresa) {
		return httpBadRequest("Conta corrente não encontrada");
	}

	const todos = await listarItensConciliacaoCielo(idconciliacao);
	const selecionados = idsitens?.length
		? todos.filter((registro) => idsitens.includes(registro.item.id))
		: todos.filter(
				(registro) =>
					registro.item.statusprocessamento ===
						STATUS_CONCILIACAO_CIELO_ITEM.ASSOCIADO &&
					Boolean(registro.item.idfinanceiro),
			);

	if (selecionados.length === 0) {
		return httpBadRequest("Nenhum item associado para confirmar");
	}

	let confirmados = 0;
	let ignorados = 0;
	let erros = 0;

	for (const registro of selecionados) {
		const item = registro.item;
		if (item.statusprocessamento === STATUS_CONCILIACAO_CIELO_ITEM.CONFIRMADO) {
			ignorados += 1;
			continue;
		}
		if (!item.idfinanceiro) {
			await atualizarItemConciliacaoCielo(item.id, {
				statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ERRO,
				mensagemerro: "Associe um título a receber antes de confirmar",
			});
			erros += 1;
			continue;
		}

		try {
			const titulo = await buscarFinanceiroPorId(item.idfinanceiro);
			if (!titulo || titulo.idempresa !== idempresa) {
				await atualizarItemConciliacaoCielo(item.id, {
					statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ERRO,
					mensagemerro: "Título não encontrado",
				});
				erros += 1;
				continue;
			}

			if (baixarTitulos) {
				if (titulo.status !== "A") {
					await atualizarItemConciliacaoCielo(item.id, {
						statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.IGNORADO,
						mensagemerro: "Título já baixado ou não está aberto",
					});
					ignorados += 1;
					continue;
				}

				const valorLiquido =
					valorNumero(item.valorliquido) || valorNumero(item.valorbruto);
				const valorTaxa = Math.abs(valorNumero(item.valortaxa));
				if (valorLiquido <= 0) {
					await atualizarItemConciliacaoCielo(item.id, {
						statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ERRO,
						mensagemerro: "Valor líquido inválido no lançamento Cielo",
					});
					erros += 1;
					continue;
				}

				const dataPagamento =
					item.datapagamento ||
					item.dataprevistapagamento ||
					new Date().toISOString().slice(0, 10);

				const baixa = await criarFinanceiroLancamentoService({
					idusuario,
					dadosFinanceiroLancamento: {
						id: uuidv4(),
						idfinanceiro: titulo.id,
						valor: String(valorLiquido),
						valorbaixa: String(valorLiquido),
						juros: "0",
						multa: "0",
						desconto: String(valorTaxa > 0 ? valorTaxa : 0),
						pagamento: dataPagamento,
						baixa: new Date().toISOString(),
						evento: Date.now(),
						historico: `Conciliação Cielo NSU ${item.nsu ?? "-"} auth ${item.codigoautorizacao ?? "-"}`,
						pagamentos: [
							{
								metodo: "Cartão",
								valor: String(valorLiquido),
								conta: idcontacorrente,
							},
						],
					},
				});

				if (!baixa.success) {
					await atualizarItemConciliacaoCielo(item.id, {
						statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ERRO,
						mensagemerro: mensagemErroHttp(baixa, "Falha ao baixar título"),
					});
					erros += 1;
					continue;
				}
			}

			await atualizarItemConciliacaoCielo(item.id, {
				statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.CONFIRMADO,
				mensagemerro: null,
			});
			confirmados += 1;
		} catch (error) {
			await atualizarItemConciliacaoCielo(item.id, {
				statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ERRO,
				mensagemerro:
					error instanceof Error ? error.message : "Erro ao confirmar item",
			});
			erros += 1;
		}
	}

	const itensAtualizados = await listarItensConciliacaoCielo(idconciliacao);
	const pendentes = itensAtualizados.filter(
		(registro) =>
			registro.item.statusprocessamento ===
				STATUS_CONCILIACAO_CIELO_ITEM.PENDENTE ||
			registro.item.statusprocessamento ===
				STATUS_CONCILIACAO_CIELO_ITEM.ASSOCIADO,
	).length;

	await atualizarConciliacaoCielo(idconciliacao, {
		idcontacorrente,
		status:
			pendentes > 0
				? STATUS_CONCILIACAO_CIELO.PARCIAL
				: STATUS_CONCILIACAO_CIELO.CONCLUIDO,
		processadoem: new Date().toISOString(),
	});

	return httpOk({
		confirmados,
		ignorados,
		erros,
		itens: itensAtualizados.map((registro) => registro.item),
	});
}
