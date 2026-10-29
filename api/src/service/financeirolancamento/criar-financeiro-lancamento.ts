import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { db } from "@/repositories/connection.js";
import {
	buscarContaCorrenteCaixaPadrao,
	buscarContaCorrentePorId,
	criarContaCorrenteCaixaPadrao,
	verificarContaCorrentePertenceEmpresa,
} from "@/repositories/conta-corrente-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpNaoEncontrado,
} from "@/util/http-util.js";
import {
	formatarDataIso,
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";
import * as schema from "../../../drizzle/schema.js";

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

const TOLERANCIA_MONETARIA = 0.009;

function arredondarDinheiro(valor: number): number {
	return Math.round(valor * 100) / 100;
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

export function resolverValorAbatimentoSaldo({
	valorBaixa,
	juros,
	multa,
	desconto,
}: {
	valorBaixa: number;
	juros?: string | number | null | undefined;
	multa?: string | number | null | undefined;
	desconto?: string | number | null | undefined;
}) {
	const jurosNum = parseValorMonetario(String(juros ?? 0));
	const multaNum = parseValorMonetario(String(multa ?? 0));
	const descontoNum = parseValorMonetario(String(desconto ?? 0));
	return arredondarDinheiro(valorBaixa - jurosNum - multaNum + descontoNum);
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

async function resolverContaCorrenteBaixa({
	idempresa,
	idconta,
}: {
	idempresa: string;
	idconta?: string | null | undefined;
}): Promise<{ id: string } | { erro: string }> {
	if (idconta) {
		const pertence = await verificarContaCorrentePertenceEmpresa({
			idcontacorrente: idconta,
			idempresa,
		});
		if (!pertence) {
			return { erro: "Conta corrente não pertence à empresa do título" };
		}
		const conta = await buscarContaCorrentePorId({ id: idconta });
		if (!conta) {
			return { erro: "Conta corrente não encontrada" };
		}
		return { id: conta.id };
	}

	let caixa = await buscarContaCorrenteCaixaPadrao(idempresa);
	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(idempresa);
	}
	if (!caixa) {
		return { erro: "Conta corrente Caixa não encontrada" };
	}
	return { id: caixa.id };
}

export async function criarFinanceiroLancamentoService({
	dadosFinanceiroLancamento,
	idusuario,
}: CriarFinanceiroLancamentoParametros): Promise<
	HttpResponse<FinanceiroLancamento>
> {
	const { pagamentos, ...dadosLancamento } = dadosFinanceiroLancamento;

	const financeiro = await buscarFinanceiroPorId(dadosLancamento.idfinanceiro);

	if (!financeiro) {
		return httpNaoEncontrado("Título financeiro não encontrado");
	}

	if (financeiro.status !== "A") {
		return httpBadRequest("Somente títulos abertos podem receber baixa");
	}

	const saldoAtual = arredondarDinheiro(Number(financeiro.saldo ?? 0));
	if (saldoAtual <= 0) {
		return httpBadRequest("Título sem saldo em aberto");
	}

	if (!idusuario) {
		return httpBadRequest("Usuário obrigatório para registrar a baixa");
	}

	const valorBaixa = arredondarDinheiro(
		resolverValorBaixaFinanceiro({
			valor: dadosLancamento.valor,
			valorbaixa: dadosLancamento.valorbaixa,
			pagamentos,
		}),
	);

	if (valorBaixa <= 0) {
		return httpBadRequest("Valor da baixa deve ser maior que zero");
	}

	if (Array.isArray(pagamentos) && pagamentos.length > 0) {
		for (const pagamento of pagamentos) {
			const valorLinha = parseValorMonetario(String(pagamento.valor ?? "0"));
			if (valorLinha <= 0) {
				return httpBadRequest(
					"Cada meio de pagamento deve ter valor maior que zero",
				);
			}
		}
	}

	const valorAbatimento = resolverValorAbatimentoSaldo({
		valorBaixa,
		juros: dadosLancamento.juros,
		multa: dadosLancamento.multa,
		desconto: dadosLancamento.desconto,
	});

	if (valorAbatimento <= 0) {
		return httpBadRequest(
			"Valor abatido do saldo deve ser maior que zero após juros, multa e desconto",
		);
	}

	if (valorAbatimento > saldoAtual + TOLERANCIA_MONETARIA) {
		return httpBadRequest("Valor da baixa excede o saldo em aberto do título");
	}

	const historicoFinal =
		resolverHistoricoBaixaFinanceiro({
			historico: dadosLancamento.historico,
			pagamentos,
		}) ??
		(financeiro.tipo === "P"
			? "Baixa de título a pagar"
			: "Baixa de título a receber");

	const dataPagamento =
		dadosLancamento.pagamento ??
		financeiro.pagamento ??
		formatarDataIso(new Date());
	const dataBaixa =
		dadosLancamento.baixa ?? financeiro.baixa ?? dataPagamento;
	const evento = dadosLancamento.evento ?? Date.now();
	const idLancamento = dadosLancamento.id ?? uuidv4();

	const movimentos: Array<{
		idcontacorrente: string;
		valor: number;
		historico: string;
	}> = [];

	if (Array.isArray(pagamentos) && pagamentos.length > 0) {
		for (const pagamentoLinha of pagamentos) {
			const valorLinha = parseValorMonetario(
				String(pagamentoLinha.valor ?? "0"),
			);
			const contaResolvida = await resolverContaCorrenteBaixa({
				idempresa: financeiro.idempresa,
				idconta: pagamentoLinha.conta,
			});
			if ("erro" in contaResolvida) {
				return httpBadRequest(contaResolvida.erro);
			}
			const metodo = pagamentoLinha.metodo ?? "Pagamento";
			movimentos.push({
				idcontacorrente: contaResolvida.id,
				valor: valorLinha,
				historico: `${historicoFinal} (${metodo})`,
			});
		}
	} else {
		const contaResolvida = await resolverContaCorrenteBaixa({
			idempresa: financeiro.idempresa,
			idconta: null,
		});
		if ("erro" in contaResolvida) {
			return httpBadRequest(contaResolvida.erro);
		}
		movimentos.push({
			idcontacorrente: contaResolvida.id,
			valor: valorBaixa,
			historico: historicoFinal,
		});
	}

	const saldoNovo = arredondarDinheiro(
		Math.max(0, saldoAtual - valorAbatimento),
	);
	const statusNovo = saldoNovo > TOLERANCIA_MONETARIA ? "A" : "P";
	const valorPagoAnterior = parseValorMonetario(financeiro.valorpagorecebido);
	const tipoMovimentoCc: "C" | "D" = financeiro.tipo === "P" ? "D" : "C";
	const dataHoraMovimento = formatarDataIso(new Date());

	try {
		const financeiroLancamento = await db.transaction(async (tx) => {
			const [lancamentoCriado] = await tx
				.insert(schema.financeirolancamento)
				.values({
					...dadosLancamento,
					id: idLancamento,
					valor: formatarValorMonetario(valorBaixa),
					valorbaixa: formatarValorMonetario(valorBaixa),
					pagamento: dataPagamento,
					baixa: dataBaixa,
					evento,
					historico: historicoFinal,
					cancelado: 0,
					currenttimemillis: dadosLancamento.currenttimemillis ?? Date.now(),
				})
				.returning();

			if (!lancamentoCriado) {
				throw new Error("Falha ao criar lançamento financeiro");
			}

			await tx
				.update(schema.financeiro)
				.set({
					saldo: formatarValorMonetario(saldoNovo),
					status: statusNovo,
					pagamento: dataPagamento,
					baixa: dataBaixa,
					valorpagorecebido: formatarValorMonetario(
						valorPagoAnterior + valorAbatimento,
					),
				})
				.where(eq(schema.financeiro.id, financeiro.id));

			for (const movimento of movimentos) {
				await inserirLancamentoCaixa(tx, {
					idcontacorrente: movimento.idcontacorrente,
					idusuario,
					idplanocontas: financeiro.idplanocontas,
					valor: movimento.valor,
					historico: movimento.historico,
					documento: financeiro.documento ?? financeiro.id,
					datahora: dataHoraMovimento,
					tipo: tipoMovimentoCc,
					evento,
				});
			}

			return lancamentoCriado;
		});

		return httpCriacao<FinanceiroLancamento>(financeiroLancamento);
	} catch (error) {
		console.error("Erro ao criar baixa financeira:", error);
		return httpErroInterno();
	}
}
