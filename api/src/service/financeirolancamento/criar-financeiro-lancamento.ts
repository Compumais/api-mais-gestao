import { v4 as uuidv4 } from "uuid";
import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarUltimoLancamentoContaCorrente,
	criarContaCorrenteLancamento,
} from "@/repositories/conta-corrente-lancamento-repositories.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import { criarFinanceiroLancamento } from "@/repositories/financeiro-lancamento-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import { httpCriacao, httpErro } from "@/util/http-util.js";
import {
	formatarDataIso,
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

export type MetodoPagamentoFinanceiro = {
	valor?: string | number | null | undefined;
	metodo?: string | null | undefined;
	conta?: string | null | undefined;
	observacao?: string | null | undefined;
};

export type FinanceiroLancamentoComPagamentos = NovoFinanceiroLancamento & {
	pagamentos?: MetodoPagamentoFinanceiro[] | undefined;
};

interface CriarFinanceiroLancamentoParametros {
	dadosFinanceiroLancamento: FinanceiroLancamentoComPagamentos;
	idusuario?: string | undefined;
}

export function resolverValorBaixaFinanceiro({
	valor,
	valorbaixa,
	pagamentos,
}: {
	valor?: string | number | null | undefined;
	valorbaixa?: string | number | null | undefined;
	pagamentos?: MetodoPagamentoFinanceiro[] | undefined;
}) {
	if (Array.isArray(pagamentos) && pagamentos.length > 0) {
		return pagamentos.reduce((total, pagamento) => {
			return total + parseValorMonetario(String(pagamento?.valor ?? "0"));
		}, 0);
	}

	return parseValorMonetario(String(valorbaixa ?? valor ?? 0));
}

export function resolverHistoricoBaixaFinanceiro({
	historico,
	pagamentos,
}: {
	historico?: string | null | undefined;
	pagamentos?: MetodoPagamentoFinanceiro[] | undefined;
}) {
	if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
		return historico ?? null;
	}

	const resumo = pagamentos
		.filter((pagamento) => pagamento && String(pagamento.valor ?? "").trim())
		.map((pagamento) => {
			const metodo = pagamento.metodo ?? "Pagamento";
			const valor = parseValorMonetario(String(pagamento.valor ?? "0"));
			return `${metodo}: ${formatarValorMonetario(valor)}`;
		})
		.join("; ");

	return resumo || historico || null;
}

async function registrarEntradaCaixaPorBaixa({
	idempresa,
	idusuario,
	idplanocontas,
	valor,
	historico,
	documento,
	evento,
}: {
	idempresa: string;
	idusuario: string;
	idplanocontas: string;
	valor: number;
	historico: string;
	documento: string;
	evento: number;
}): Promise<void> {
	let caixa = await buscarContaCorrenteCaixaPadrao(idempresa);

	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(idempresa);
	}

	if (!caixa) {
		throw new Error("Conta corrente Caixa não encontrada");
	}

	const ultimoLancamento = await buscarUltimoLancamentoContaCorrente({
		idcontacorrente: caixa.id,
	});

	const saldoAnterior = ultimoLancamento?.saldoatual
		? Number(ultimoLancamento.saldoatual)
		: 0;
	const saldoAtual = saldoAnterior + valor;

	await criarContaCorrenteLancamento({
		id: uuidv4(),
		idcontacorrente: caixa.id,
		datahora: formatarDataIso(new Date()),
		tipo: "C",
		valor: formatarValorMonetario(valor),
		saldoanterior: formatarValorMonetario(saldoAnterior),
		saldoatual: formatarValorMonetario(saldoAtual),
		historico,
		idusuario,
		idplanocontas,
		documento,
		evento,
		currenttimemillis: Date.now(),
	});
}

export async function criarFinanceiroLancamentoService({
	dadosFinanceiroLancamento,
	idusuario,
}: CriarFinanceiroLancamentoParametros): Promise<
	HttpResponse<FinanceiroLancamento>
> {
	const financeiroLancamento = await criarFinanceiroLancamento(
		dadosFinanceiroLancamento,
	);

	if (!financeiroLancamento) {
		return httpErro();
	}

	const financeiro = await buscarFinanceiroPorId(
		dadosFinanceiroLancamento.idfinanceiro,
	);

	if (financeiro) {
		const valorBaixa = resolverValorBaixaFinanceiro(dadosFinanceiroLancamento);

		if (valorBaixa > 0) {
			const saldoAtual = Number(financeiro.saldo ?? 0);
			const valorPagoAnterior = parseValorMonetario(financeiro.valorpagorecebido);
			const saldoNovo = Math.max(0, saldoAtual - valorBaixa);
			const statusNovo = saldoNovo > 0 ? "A" : "B";
			const pagamento =
				dadosFinanceiroLancamento.pagamento ??
				financeiro.pagamento ??
				formatarDataIso(new Date());
			const baixa =
				dadosFinanceiroLancamento.baixa ?? financeiro.baixa ?? pagamento;

			await atualizarFinanceiro(financeiro.id, {
				saldo: formatarValorMonetario(saldoNovo),
				status: statusNovo,
				pagamento,
				baixa,
				valorpagorecebido: formatarValorMonetario(
					valorPagoAnterior + valorBaixa,
				),
			});
		}
	}

	if (
		financeiro?.tipo === "R" &&
		financeiro.idplanocontas &&
		idusuario &&
		dadosFinanceiroLancamento.evento
	) {
		const valorBaixa = resolverValorBaixaFinanceiro(dadosFinanceiroLancamento);

		if (valorBaixa > 0) {
			try {
				await registrarEntradaCaixaPorBaixa({
					idempresa: financeiro.idempresa,
					idusuario,
					idplanocontas: financeiro.idplanocontas,
					valor: valorBaixa,
					historico:
						resolverHistoricoBaixaFinanceiro({
							historico:
								dadosFinanceiroLancamento.historico ??
								financeiro.historico ??
								"Baixa de título a receber",
							pagamentos: dadosFinanceiroLancamento.pagamentos,
						}) ?? "Baixa de título a receber",
					documento: financeiro.documento ?? financeiro.id,
					evento: dadosFinanceiroLancamento.evento,
				});
			} catch (error) {
				console.error(
					"Erro ao registrar entrada no Caixa após baixa financeira:",
					error,
				);
			}
		}
	}

	return httpCriacao<FinanceiroLancamento>(financeiroLancamento);
}
