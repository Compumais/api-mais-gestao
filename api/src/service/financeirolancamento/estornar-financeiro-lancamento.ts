import { eq } from "drizzle-orm";
import type { FinanceiroLancamento } from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { db } from "@/repositories/connection.js";
import { listarContaCorrenteLancamentoPorEvento } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarFinanceiroLancamentoPorId } from "@/repositories/financeiro-lancamento-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { resolverValorAbatimentoSaldo } from "@/service/financeirolancamento/criar-financeiro-lancamento.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import {
	formatarDataIso,
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";
import * as schema from "../../../drizzle/schema.js";

interface EstornarFinanceiroLancamentoParametros {
	id: string;
	idusuario: string;
}

const TOLERANCIA_MONETARIA = 0.009;

function arredondarDinheiro(valor: number): number {
	return Math.round(valor * 100) / 100;
}

export async function estornarFinanceiroLancamentoService({
	id,
	idusuario,
}: EstornarFinanceiroLancamentoParametros): Promise<
	HttpResponse<FinanceiroLancamento>
> {
	const lancamento = await buscarFinanceiroLancamentoPorId(id);

	if (!lancamento) {
		return httpNaoEncontrado("Lançamento financeiro não encontrado");
	}

	if (lancamento.cancelado === 1) {
		return httpBadRequest("Lançamento já está estornado");
	}

	const financeiro = await buscarFinanceiroPorId(lancamento.idfinanceiro);

	if (!financeiro) {
		return httpNaoEncontrado("Título financeiro não encontrado");
	}

	const valorBaixa = parseValorMonetario(
		String(lancamento.valorbaixa ?? lancamento.valor ?? 0),
	);
	const valorAbatimento = resolverValorAbatimentoSaldo({
		valorBaixa,
		juros: lancamento.juros,
		multa: lancamento.multa,
		desconto: lancamento.desconto,
	});

	if (valorAbatimento <= 0) {
		return httpBadRequest("Lançamento sem valor para estornar");
	}

	const saldoAtual = arredondarDinheiro(Number(financeiro.saldo ?? 0));
	const valorPagoAtual = parseValorMonetario(financeiro.valorpagorecebido);
	const saldoNovo = arredondarDinheiro(saldoAtual + valorAbatimento);
	const valorPagoNovo = arredondarDinheiro(
		Math.max(0, valorPagoAtual - valorAbatimento),
	);
	const statusNovo = saldoNovo > TOLERANCIA_MONETARIA ? "A" : "P";
	const dataHoraCancelado = formatarDataIso(new Date());

	const movimentosOriginais = await listarContaCorrenteLancamentoPorEvento(
		lancamento.evento,
	);

	try {
		const lancamentoEstornado = await db.transaction(async (tx) => {
			const [atualizado] = await tx
				.update(schema.financeirolancamento)
				.set({
					cancelado: 1,
					datahoracancelado: dataHoraCancelado,
				})
				.where(eq(schema.financeirolancamento.id, id))
				.returning();

			if (!atualizado) {
				throw new Error("Falha ao marcar lançamento como estornado");
			}

			await tx
				.update(schema.financeiro)
				.set({
					saldo: formatarValorMonetario(saldoNovo),
					status: statusNovo,
					valorpagorecebido: formatarValorMonetario(valorPagoNovo),
					baixa: statusNovo === "A" ? null : financeiro.baixa,
					pagamento: statusNovo === "A" ? null : financeiro.pagamento,
				})
				.where(eq(schema.financeiro.id, financeiro.id));

			for (const movimento of movimentosOriginais) {
				const valorMovimento = parseValorMonetario(String(movimento.valor ?? 0));
				if (valorMovimento <= 0 || !movimento.idcontacorrente) {
					continue;
				}

				const tipoOriginal = movimento.tipo === "D" ? "D" : "C";
				const tipoEstorno: "C" | "D" = tipoOriginal === "C" ? "D" : "C";

				await inserirLancamentoCaixa(tx, {
					idcontacorrente: movimento.idcontacorrente,
					idusuario,
					idplanocontas: movimento.idplanocontas ?? financeiro.idplanocontas,
					valor: valorMovimento,
					historico: `Estorno: ${movimento.historico ?? "baixa financeira"}`,
					documento: movimento.documento ?? financeiro.documento ?? financeiro.id,
					datahora: dataHoraCancelado,
					tipo: tipoEstorno,
					evento: lancamento.evento,
				});
			}

			return atualizado;
		});

		return httpOk<FinanceiroLancamento>(lancamentoEstornado);
	} catch (error) {
		console.error("Erro ao estornar baixa financeira:", error);
		return httpErroInterno();
	}
}
