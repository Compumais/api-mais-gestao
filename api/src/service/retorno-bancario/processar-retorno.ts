import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { RetornoBancarioItem } from "@/model/retorno-bancario-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
	buscarFinanceiroPorNossoNumero,
} from "@/repositories/financeiro-repositories.js";
import {
	atualizarRetornoBancario,
	atualizarRetornoBancarioItem,
	buscarRetornoBancarioPorIdEempresa,
	listarItensRetorno,
} from "@/repositories/retorno-bancario-repositories.js";
import { criarFinanceiroLancamentoService } from "@/service/financeirolancamento/criar-financeiro-lancamento.js";
import {
	OCORRENCIAS_LIQUIDACAO,
	STATUS_RETORNO_BANCARIO,
	STATUS_RETORNO_ITEM,
} from "@/util/cnab-layouts.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ProcessarRetornoParametros = {
	idempresa: string;
	idusuario: string;
	idretorno: string;
	idsitens?: string[] | undefined;
};

export type ResultadoProcessarRetorno = {
	processados: number;
	ignorados: number;
	erros: number;
	itens: RetornoBancarioItem[];
};

function valorNumero(valor: string | null | undefined): number {
	return Math.round(Number(valor ?? 0) * 100) / 100;
}

export async function processarRetornoBancarioService({
	idempresa,
	idusuario,
	idretorno,
	idsitens,
}: ProcessarRetornoParametros): Promise<
	HttpResponse<ResultadoProcessarRetorno>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const retorno = await buscarRetornoBancarioPorIdEempresa(idretorno, idempresa);
	if (!retorno) return httpBadRequest("Retorno não encontrado");

	const itens = await listarItensRetorno(idretorno);
	const selecionados = idsitens?.length
		? itens.filter((i) => idsitens.includes(i.id))
		: itens.filter((i) => i.statusprocessamento === STATUS_RETORNO_ITEM.PENDENTE);

	if (selecionados.length === 0) {
		return httpBadRequest("Nenhum item pendente para processar");
	}

	let processados = 0;
	let ignorados = 0;
	let erros = 0;

	for (const item of selecionados) {
		if (item.statusprocessamento === STATUS_RETORNO_ITEM.PROCESSADO) {
			ignorados += 1;
			continue;
		}

		try {
			let titulo = item.idfinanceiro
				? await buscarFinanceiroPorId(item.idfinanceiro)
				: undefined;
			if (!titulo && item.nossonumero) {
				titulo = await buscarFinanceiroPorNossoNumero({
					idempresa,
					nossonumero: item.nossonumero,
				});
			}

			const ocorrencia = (item.ocorrencia ?? "").padStart(2, "0");
			const isLiquidacao = OCORRENCIAS_LIQUIDACAO.has(ocorrencia);

			if (!titulo) {
				await atualizarRetornoBancarioItem(item.id, {
					statusprocessamento: STATUS_RETORNO_ITEM.ERRO,
					mensagemerro: "Título não encontrado pelo nosso número",
				});
				erros += 1;
				continue;
			}

			await atualizarRetornoBancarioItem(item.id, {
				idfinanceiro: titulo.id,
			});

			if (!isLiquidacao) {
				await atualizarFinanceiro(titulo.id, {
					ultimaocorrenciabancaria: `${ocorrencia}${
						item.ocorrenciadescricao ? ` - ${item.ocorrenciadescricao}` : ""
					}`,
					acaoprocessamentoretorno: ocorrencia,
				});
				await atualizarRetornoBancarioItem(item.id, {
					statusprocessamento: STATUS_RETORNO_ITEM.PROCESSADO,
					mensagemerro: null,
				});
				processados += 1;
				continue;
			}

			if (titulo.status !== "A") {
				await atualizarRetornoBancarioItem(item.id, {
					statusprocessamento: STATUS_RETORNO_ITEM.IGNORADO,
					mensagemerro: "Título já baixado ou não está aberto",
				});
				ignorados += 1;
				continue;
			}

			const valorPago = valorNumero(item.valorpago ?? item.valor);
			const juros = valorNumero(item.juros);
			const multa = valorNumero(item.multa);
			const desconto = valorNumero(item.desconto);

			const dataPagamento =
				item.datacredito ||
				item.dataocorrencia ||
				new Date().toISOString().slice(0, 10);

			const baixa = await criarFinanceiroLancamentoService({
				idusuario,
				dadosFinanceiroLancamento: {
					id: uuidv4(),
					idfinanceiro: titulo.id,
					valor: String(valorPago),
					valorbaixa: String(valorPago),
					juros: String(juros),
					multa: String(multa),
					desconto: String(desconto),
					pagamento: dataPagamento,
					baixa: new Date().toISOString(),
					evento: Date.now(),
					historico: `Baixa automática retorno ${ocorrencia}${
						item.ocorrenciadescricao ? ` - ${item.ocorrenciadescricao}` : ""
					}`,
					pagamentos: [
						{
							metodo: "Boleto",
							valor: String(valorPago),
							conta: retorno.idcontacorrente,
						},
					],
				},
			});

			if (!baixa.success) {
				await atualizarRetornoBancarioItem(item.id, {
					statusprocessamento: STATUS_RETORNO_ITEM.ERRO,
					mensagemerro: mensagemErroHttp(baixa, "Falha ao baixar título"),
				});
				erros += 1;
				continue;
			}

			await atualizarFinanceiro(titulo.id, {
				ultimaocorrenciabancaria: `${ocorrencia}${
					item.ocorrenciadescricao ? ` - ${item.ocorrenciadescricao}` : ""
				}`,
				acaoprocessamentoretorno: ocorrencia,
			});

			await atualizarRetornoBancarioItem(item.id, {
				statusprocessamento: STATUS_RETORNO_ITEM.PROCESSADO,
				mensagemerro: null,
			});
			processados += 1;
		} catch (error) {
			await atualizarRetornoBancarioItem(item.id, {
				statusprocessamento: STATUS_RETORNO_ITEM.ERRO,
				mensagemerro:
					error instanceof Error ? error.message : "Erro ao processar item",
			});
			erros += 1;
		}
	}

	const itensAtualizados = await listarItensRetorno(idretorno);
	const pendentes = itensAtualizados.filter(
		(i) => i.statusprocessamento === STATUS_RETORNO_ITEM.PENDENTE,
	).length;
	const statusFinal =
		pendentes > 0
			? STATUS_RETORNO_BANCARIO.PROCESSADO_PARCIAL
			: erros > 0 && processados === 0
				? STATUS_RETORNO_BANCARIO.ERRO
				: STATUS_RETORNO_BANCARIO.PROCESSADO;

	await atualizarRetornoBancario(idretorno, {
		status: statusFinal,
		processadoem: new Date().toISOString(),
	});

	return httpOk({
		processados,
		ignorados,
		erros,
		itens: itensAtualizados,
	});
}
