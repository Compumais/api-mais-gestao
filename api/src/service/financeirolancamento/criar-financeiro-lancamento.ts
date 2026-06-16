import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import {
	buscarUltimoLancamentoContaCorrente,
	criarContaCorrenteLancamento,
} from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { criarFinanceiroLancamento } from "@/repositories/financeiro-lancamento-repositories.js";
import {
	formatarDataIso,
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";
import { httpCriacao, httpErro } from "@/util/http-util.js";
import { v4 as uuidv4 } from "uuid";

interface CriarFinanceiroLancamentoParametros {
	dadosFinanceiroLancamento: NovoFinanceiroLancamento;
	idusuario?: string | undefined;
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

	if (
		financeiro?.tipo === "R" &&
		financeiro.idplanocontas &&
		idusuario &&
		dadosFinanceiroLancamento.evento
	) {
		const valorBaixa = parseValorMonetario(
			dadosFinanceiroLancamento.valorbaixa ?? dadosFinanceiroLancamento.valor,
		);

		if (valorBaixa > 0) {
			try {
				await registrarEntradaCaixaPorBaixa({
					idempresa: financeiro.idempresa,
					idusuario,
					idplanocontas: financeiro.idplanocontas,
					valor: valorBaixa,
					historico:
						dadosFinanceiroLancamento.historico ??
						financeiro.historico ??
						"Baixa de título a receber",
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
