import type { BudgetCentroCusto, NovoBudgetCentroCusto } from "@/model/budget-centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarBudgetCentroCustoDuplicado,
	criarBudgetCentroCusto,
} from "@/repositories/budget-centro-custo-repositories.js";
import { buscarCentroCustoPorId } from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

export async function criarBudgetCentroCustoService({
	idusuario,
	dados,
}: {
	idusuario: string;
	dados: Omit<NovoBudgetCentroCusto, "currenttimemillis">;
}): Promise<HttpResponse<BudgetCentroCusto>> {
	const permitido = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);
	if (!permitido) return httpProibido();

	if (dados.periodicidade === "M" && !dados.mes) {
		return httpBadRequest("Mês é obrigatório para orçamento mensal.");
	}
	if (Number(dados.valor) <= 0) {
		return httpBadRequest("Valor orçado deve ser maior que zero.");
	}

	const centro = await buscarCentroCustoPorId(dados.idcentrocusto);
	if (!centro || centro.idempresa !== dados.idempresa) {
		return httpBadRequest("Centro de custo inválido.");
	}

	const mes = dados.periodicidade === "A" ? null : dados.mes;
	const duplicado = await buscarBudgetCentroCustoDuplicado({
		idempresa: dados.idempresa,
		idcentrocusto: dados.idcentrocusto,
		idplanocontas: dados.idplanocontas ?? null,
		ano: dados.ano,
		mes,
	});
	if (duplicado) {
		return httpRecursoExistente(
			"Já existe orçamento para este centro de custo no período.",
		);
	}

	const registro = await criarBudgetCentroCusto({
		...dados,
		mes,
		currenttimemillis: Date.now(),
	});
	if (!registro) return httpErroInterno();
	return httpCriacao(registro);
}
