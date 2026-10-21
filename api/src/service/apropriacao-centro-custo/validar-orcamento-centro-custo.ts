import { buscarConfigFinanceiroEmpresa } from "@/repositories/config-financeiro-empresa-repositories.js";
import { somarLimiteOrcamentoCentroNoPeriodo } from "@/repositories/budget-centro-custo-repositories.js";
import { obterRealizadoCentroCustoPeriodo } from "@/repositories/budget-centro-custo-repositories.js";
import type { RegimeApropriacao } from "@/constants/centro-custo.js";
import { arredondarMoeda } from "@/util/apropriacao-centro-custo-util.js";

export async function validarOrcamentoCentroCusto({
	idempresa,
	idcentrocusto,
	regime,
	valorIncremento,
	datalancamento,
}: {
	idempresa: string;
	idcentrocusto: string;
	regime: RegimeApropriacao;
	valorIncremento: number;
	datalancamento: string;
}): Promise<{ ok: true } | { ok: false; mensagem: string }> {
	const config = await buscarConfigFinanceiroEmpresa(idempresa);
	if (!config?.bloqueardespesaacimaorcamento) {
		return { ok: true };
	}

	const [anoStr, mesStr] = datalancamento.split("-");
	const ano = Number(anoStr);
	const mes = Number(mesStr);
	if (!ano || !mes) {
		return { ok: true };
	}

	const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
	const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`;

	const limite = await somarLimiteOrcamentoCentroNoPeriodo({
		idempresa,
		idcentrocusto,
		ano,
		mes,
	});

	if (limite <= 0) {
		return { ok: true };
	}

	const realizado = await obterRealizadoCentroCustoPeriodo({
		idempresa,
		idcentrocusto,
		dataInicio,
		dataFim,
		regime,
	});

	const tolerancia = Number(config.percentualtoleranciaorcamentocc ?? 0);
	const limiteComTolerancia = arredondarMoeda(
		limite * (1 + tolerancia / 100),
	);

	if (realizado + valorIncremento > limiteComTolerancia) {
		return {
			ok: false,
			mensagem: `Despesa excede o orçamento do centro de custo (limite ${limiteComTolerancia.toFixed(2)}).`,
		};
	}

	return { ok: true };
}
