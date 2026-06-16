import type { PlanoContas } from "@/model/plano-contas-model.js";
import {
	criarPlanoContasEmLote,
	verificarEmpresaPossuiPlanoContas,
} from "@/repositories/plano-contas-repositories.js";
import { montarPlanoContasPadrao } from "@/util/plano-contas-padrao.js";

export async function criarPlanoContasPadraoService(
	idempresa: string,
): Promise<PlanoContas[]> {
	const possuiPlano = await verificarEmpresaPossuiPlanoContas(idempresa);

	if (possuiPlano) {
		return [];
	}

	const planos = montarPlanoContasPadrao(idempresa);
	const planosCriados = await criarPlanoContasEmLote(planos);

	if (planosCriados.length !== planos.length) {
		throw new Error("Erro ao criar plano de contas padrão da empresa");
	}

	return planosCriados;
}
