import type { BudgetAcompanhamentoItem } from "@/model/budget-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarBudgetsPorAno,
	somarGastosPorPlanoContas,
} from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type AcompanhamentoBudgetParametros = {
	idusuario: string;
	idempresa: string;
	ano: number;
	mes?: number | undefined;
};

type AcompanhamentoBudgetResposta = {
	ano: number;
	mes: number | null;
	data: BudgetAcompanhamentoItem[];
};

function arredondar(valor: number) {
	return Math.round(valor * 100) / 100;
}

export async function acompanhamentoBudgetService({
	idusuario,
	idempresa,
	ano,
	mes,
}: AcompanhamentoBudgetParametros): Promise<
	HttpResponse<AcompanhamentoBudgetResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dataInicio = mes
		? `${ano}-${String(mes).padStart(2, "0")}-01`
		: `${ano}-01-01`;
	const dataFim = mes
		? `${ano}-${String(mes).padStart(2, "0")}-${String(
				new Date(ano, mes, 0).getDate(),
			).padStart(2, "0")}`
		: `${ano}-12-31`;

	const [budgets, gastos] = await Promise.all([
		listarBudgetsPorAno({ idempresa, ano }),
		somarGastosPorPlanoContas({ idempresa, dataInicio, dataFim }),
	]);

	const realizadoPorConta = new Map<string, number>();

	for (const gasto of gastos) {
		if (gasto.idplanocontas) {
			realizadoPorConta.set(gasto.idplanocontas, Number(gasto.total ?? 0));
		}
	}

	type Acumulador = {
		planocontascodigo: string | null;
		planocontasnome: string | null;
		limite: number;
		temMensal: boolean;
		temAnual: boolean;
	};

	const limitePorConta = new Map<string, Acumulador>();

	for (const budget of budgets) {
		let parcelaLimite = 0;

		if (budget.periodicidade === "M") {
			// No modo mensal, considera apenas o limite do mês filtrado;
			// na visão anual, soma os limites de todos os meses
			if (mes) {
				if (budget.mes === mes) {
					parcelaLimite = Number(budget.valor);
				}
			} else {
				parcelaLimite = Number(budget.valor);
			}
		} else {
			// Budget anual: na visão mensal considera 1/12 do valor
			parcelaLimite = mes ? Number(budget.valor) / 12 : Number(budget.valor);
		}

		const acumulado = limitePorConta.get(budget.idplanocontas) ?? {
			planocontascodigo: budget.planocontascodigo,
			planocontasnome: budget.planocontasnome,
			limite: 0,
			temMensal: false,
			temAnual: false,
		};

		acumulado.limite += parcelaLimite;
		acumulado.temMensal = acumulado.temMensal || budget.periodicidade === "M";
		acumulado.temAnual = acumulado.temAnual || budget.periodicidade === "A";

		limitePorConta.set(budget.idplanocontas, acumulado);
	}

	const data: BudgetAcompanhamentoItem[] = [];

	for (const [idplanocontas, acumulado] of limitePorConta) {
		const limite = arredondar(acumulado.limite);
		const realizado = arredondar(realizadoPorConta.get(idplanocontas) ?? 0);
		const saldo = arredondar(limite - realizado);
		const percentual =
			limite > 0 ? arredondar((realizado / limite) * 100) : 0;

		data.push({
			idplanocontas,
			planocontascodigo: acumulado.planocontascodigo,
			planocontasnome: acumulado.planocontasnome,
			periodicidade:
				acumulado.temMensal && acumulado.temAnual
					? "MA"
					: acumulado.temAnual
						? "A"
						: "M",
			limite,
			realizado,
			saldo,
			percentual,
		});
	}

	data.sort((a, b) =>
		(a.planocontascodigo ?? "").localeCompare(b.planocontascodigo ?? "", "pt", {
			numeric: true,
		}),
	);

	return httpOk<AcompanhamentoBudgetResposta>({
		ano,
		mes: mes ?? null,
		data,
	});
}
