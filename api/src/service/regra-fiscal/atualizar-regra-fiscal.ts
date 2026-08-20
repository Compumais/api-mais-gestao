import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	FontesRegraFiscal,
	StatusRegraFiscal,
} from "@/model/regra-fiscal-model.js";
import {
	atualizarRegraFiscal,
	buscarRegraFiscalPorId,
	buscarRegraFiscalPorRuleId,
	criarHistoricoRegraFiscal,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import {
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpRecursoExistente,
} from "@/util/http-util.js";

export type DadosAtualizarRegraFiscal = {
	ruleid?: string;
	descricao?: string;
	prioridade?: number;
	vigenciainicio?: string;
	vigenciafim?: string | null;
	condicoes?: Record<string, unknown>;
	resultado?: Record<string, unknown>;
	fontes?: FontesRegraFiscal;
	status?: StatusRegraFiscal;
	idempresa?: string | null;
};

export async function atualizarRegraFiscalService(params: {
	id: string;
	dados: DadosAtualizarRegraFiscal;
	idusuario: string;
}): Promise<HttpResponse<RegraFiscal>> {
	const atual = await buscarRegraFiscalPorId(params.id);
	if (!atual) return httpNaoEncontrado();

	if (params.dados.ruleid && params.dados.ruleid !== atual.ruleid) {
		const duplicado = await buscarRegraFiscalPorRuleId(params.dados.ruleid);
		if (duplicado) return httpRecursoExistente("rule_id já existe");
	}

	await criarHistoricoRegraFiscal({
		id: uuidv4(),
		idregrafiscal: atual.id,
		versao: atual.versao,
		snapshot: atual,
		idusuario: params.idusuario,
	});

	const registro = await atualizarRegraFiscal(params.id, {
		...params.dados,
		versao: atual.versao + 1,
		status: params.dados.status ?? "pendente_revisao",
		validadoem: null,
		validadopor: null,
	});

	if (!registro) return httpErro();
	return httpOk(registro);
}
