import type { HttpResponse } from "@/model/http-model.js";
import type { FontesRegraFiscal, StatusRegraFiscal } from "@/model/regra-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarRegraFiscalPorRuleId,
	criarRegraFiscal,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import {
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

export type DadosNovaRegraFiscal = {
	id: string;
	ruleid: string;
	descricao: string;
	prioridade?: number;
	vigenciainicio: string;
	vigenciafim?: string | null;
	condicoes: Record<string, unknown>;
	resultado: Record<string, unknown>;
	fontes: FontesRegraFiscal;
	status?: StatusRegraFiscal;
	idempresa?: string | null;
};

export async function criarRegraFiscalService(params: {
	dados: DadosNovaRegraFiscal;
	idusuario: string;
}): Promise<HttpResponse<RegraFiscal | null>> {
	if (params.dados.idempresa) {
		const pertence = await verificarUsuarioPertenceEmpresa(
			params.idusuario,
			params.dados.idempresa,
		);
		if (!pertence) return httpProibido();
	}

	const duplicado = await buscarRegraFiscalPorRuleId(params.dados.ruleid);
	if (duplicado) return httpRecursoExistente("rule_id já existe");

	const registro = await criarRegraFiscal({
		id: params.dados.id,
		ruleid: params.dados.ruleid,
		descricao: params.dados.descricao,
		prioridade: params.dados.prioridade ?? 100,
		vigenciainicio: params.dados.vigenciainicio,
		vigenciafim: params.dados.vigenciafim ?? null,
		condicoes: params.dados.condicoes,
		resultado: params.dados.resultado,
		fontes: params.dados.fontes,
		status: params.dados.status ?? "rascunho",
		versao: 1,
		idempresa: params.dados.idempresa ?? null,
	});

	if (!registro) return httpErro();
	return httpCriacao(registro);
}
