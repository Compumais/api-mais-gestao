import {
	ORIGEM_TIPO_APROPRIACAO,
	REGIME_APROPRIACAO,
	type OrigemTipoApropriacao,
	type RegimeApropriacao,
} from "@/constants/centro-custo.js";
import { buscarConfigFinanceiroEmpresa } from "@/repositories/config-financeiro-empresa-repositories.js";
import { db } from "@/repositories/connection.js";
import * as schema from "@/repositories/schema.js";
import { eq } from "drizzle-orm";
import { parseValorNumerico } from "@/util/apropriacao-centro-custo-util.js";

function normalizarData(value: string | null | undefined): string {
	if (!value?.trim()) {
		return new Date().toISOString().slice(0, 10);
	}
	return value.slice(0, 10);
}

export type ContextoOrigemApropriacao = {
	idempresa: string;
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime: RegimeApropriacao;
	valorTotal: number;
	idplanocontas: string | null;
	datalancamento: string;
	centroCustoObrigatorio: boolean;
};

export async function resolverContextoOrigemApropriacao({
	origemtipo,
	origemid,
	regime,
}: {
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime: RegimeApropriacao;
}): Promise<ContextoOrigemApropriacao | null> {
	if (origemtipo === ORIGEM_TIPO_APROPRIACAO.FINANCEIRO) {
		const [financeiro] = await db
			.select()
			.from(schema.financeiro)
			.where(eq(schema.financeiro.id, origemid));
		if (!financeiro) return null;

		const config = await buscarConfigFinanceiroEmpresa(financeiro.idempresa);
		const dataRef = normalizarData(
			config?.competenciadataref === "vencimento"
				? financeiro.vencimento
				: financeiro.emissao,
		);

		let centroCustoObrigatorio = false;
		if (financeiro.idplanocontas) {
			const [plano] = await db
				.select()
				.from(schema.planocontas)
				.where(eq(schema.planocontas.id, financeiro.idplanocontas));
			centroCustoObrigatorio = (plano?.centrocustoobrigatorio ?? 0) === 1;
		}

		return {
			idempresa: financeiro.idempresa,
			origemtipo,
			origemid,
			regime,
			valorTotal: Math.abs(parseValorNumerico(financeiro.valor)),
			idplanocontas: financeiro.idplanocontas ?? null,
			datalancamento:
				regime === REGIME_APROPRIACAO.COMPETENCIA
					? dataRef
					: normalizarData(
							financeiro.pagamento ?? financeiro.baixa ?? dataRef,
						),
			centroCustoObrigatorio,
		};
	}

	if (origemtipo === ORIGEM_TIPO_APROPRIACAO.FINANCEIRO_LANCAMENTO) {
		const [lancamento] = await db
			.select()
			.from(schema.financeirolancamento)
			.where(eq(schema.financeirolancamento.id, origemid));
		if (!lancamento) return null;

		const [financeiro] = await db
			.select()
			.from(schema.financeiro)
			.where(eq(schema.financeiro.id, lancamento.idfinanceiro));

		if (!financeiro) return null;

		return {
			idempresa: financeiro.idempresa,
			origemtipo,
			origemid,
			regime: REGIME_APROPRIACAO.CAIXA,
			valorTotal: Math.abs(parseValorNumerico(lancamento.valor)),
			idplanocontas: financeiro.idplanocontas ?? null,
			datalancamento: normalizarData(
				lancamento.pagamento ?? lancamento.baixa ?? financeiro.emissao,
			),
			centroCustoObrigatorio: false,
		};
	}

	if (origemtipo === ORIGEM_TIPO_APROPRIACAO.CONTA_CORRENTE_LANCAMENTO) {
		const [lancamento] = await db
			.select()
			.from(schema.contacorrentelancamento)
			.where(eq(schema.contacorrentelancamento.id, origemid));
		if (!lancamento) return null;

		const [conta] = await db
			.select()
			.from(schema.contacorrente)
			.where(eq(schema.contacorrente.id, lancamento.idcontacorrente));

		let centroCustoObrigatorio = false;
		if (lancamento.idplanocontas) {
			const [plano] = await db
				.select()
				.from(schema.planocontas)
				.where(eq(schema.planocontas.id, lancamento.idplanocontas));
			centroCustoObrigatorio = (plano?.centrocustoobrigatorio ?? 0) === 1;
		}

		return {
			idempresa: conta?.idempresa ?? "",
			origemtipo,
			origemid,
			regime: REGIME_APROPRIACAO.CAIXA,
			valorTotal: Math.abs(parseValorNumerico(lancamento.valor)),
			idplanocontas: lancamento.idplanocontas ?? null,
			datalancamento: normalizarData(lancamento.datahora),
			centroCustoObrigatorio,
		};
	}

	if (origemtipo === ORIGEM_TIPO_APROPRIACAO.MANUAL) {
		return {
			idempresa: "",
			origemtipo,
			origemid,
			regime,
			valorTotal: 0,
			idplanocontas: null,
			datalancamento: normalizarData(undefined),
			centroCustoObrigatorio: false,
		};
	}

	return null;
}
