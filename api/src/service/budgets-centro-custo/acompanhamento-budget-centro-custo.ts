import type { BudgetCentroCustoAcompanhamentoItem } from "@/model/budget-centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { RegimeApropriacao } from "@/constants/centro-custo.js";
import {
	listarBudgetsCentroCustoPorAno,
	obterRealizadoCentroCustoPeriodo,
} from "@/repositories/budget-centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { arredondarMoeda } from "@/util/apropriacao-centro-custo-util.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export async function acompanhamentoBudgetCentroCustoService({
	idusuario,
	idempresa,
	ano,
	mes,
	regime,
}: {
	idusuario: string;
	idempresa: string;
	ano: number;
	mes?: number;
	regime: RegimeApropriacao;
}): Promise<
	HttpResponse<{
		ano: number;
		mes: number | null;
		regime: RegimeApropriacao;
		data: BudgetCentroCustoAcompanhamentoItem[];
	}>
> {
	const permitido = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!permitido) return httpProibido();

	const dataInicio = mes
		? `${ano}-${String(mes).padStart(2, "0")}-01`
		: `${ano}-01-01`;
	const dataFim = mes
		? `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`
		: `${ano}-12-31`;

	const budgets = await listarBudgetsCentroCustoPorAno({ idempresa, ano });
	const chaves = new Map<string, BudgetCentroCustoAcompanhamentoItem>();

	for (const budget of budgets) {
		if (budget.periodicidade === "M" && mes && budget.mes !== mes) continue;
		const chave = `${budget.idcentrocusto}:${budget.idplanocontas ?? ""}`;
		const limiteAtual = chaves.get(chave)?.limite ?? 0;
		const limite =
			budget.periodicidade === "A" && mes
				? Number(budget.valor) / 12
				: Number(budget.valor);
		chaves.set(chave, {
			idcentrocusto: budget.idcentrocusto,
			centrocustocodigo: budget.centrocustocodigo,
			centrocustonome: budget.centrocustonome,
			idplanocontas: budget.idplanocontas,
			planocontascodigo: budget.planocontascodigo,
			planocontasnome: budget.planocontasnome,
			limite: arredondarMoeda(limiteAtual + limite),
			realizado: 0,
			saldo: 0,
			excesso: 0,
			percentualExecucao: 0,
			variacaoAbsoluta: 0,
			variacaoPercentual: null,
		});
	}

	const data: BudgetCentroCustoAcompanhamentoItem[] = [];
	for (const item of chaves.values()) {
		const realizado = await obterRealizadoCentroCustoPeriodo({
			idempresa,
			idcentrocusto: item.idcentrocusto,
			dataInicio,
			dataFim,
			regime,
		});
		const saldo = arredondarMoeda(item.limite - realizado);
		const excesso = saldo < 0 ? Math.abs(saldo) : 0;
		const percentualExecucao =
			item.limite > 0 ? arredondarMoeda((realizado / item.limite) * 100) : 0;
		data.push({
			...item,
			realizado: arredondarMoeda(realizado),
			saldo,
			excesso,
			percentualExecucao,
			variacaoAbsoluta: arredondarMoeda(realizado - item.limite),
			variacaoPercentual:
				item.limite > 0
					? arredondarMoeda(((realizado - item.limite) / item.limite) * 100)
					: null,
		});
	}

	return httpOk({ ano, mes: mes ?? null, regime, data });
}
