import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarRegraFiscal,
	buscarHistoricoRegraFiscal,
	buscarRegraFiscalPorId,
	criarHistoricoRegraFiscal,
	type NovaRegraFiscal,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function rollbackRegraFiscalService(params: {
	id: string;
	versao: number;
	idusuario: string;
}): Promise<HttpResponse<RegraFiscal>> {
	const atual = await buscarRegraFiscalPorId(params.id);
	if (!atual) return httpNaoEncontrado();

	const historico = await buscarHistoricoRegraFiscal(params.id, params.versao);
	if (!historico) {
		return httpBadRequest("Versão de histórico não encontrada", {
			code: "VERSAO_NAO_ENCONTRADA",
		});
	}

	const snapshot = historico.snapshot as Partial<NovaRegraFiscal>;

	await criarHistoricoRegraFiscal({
		id: uuidv4(),
		idregrafiscal: atual.id,
		versao: atual.versao,
		snapshot: atual,
		idusuario: params.idusuario,
	});

	const registro = await atualizarRegraFiscal(params.id, {
		descricao: snapshot.descricao ?? atual.descricao,
		prioridade: snapshot.prioridade ?? atual.prioridade,
		vigenciainicio: snapshot.vigenciainicio ?? atual.vigenciainicio,
		vigenciafim: snapshot.vigenciafim,
		condicoes: snapshot.condicoes ?? atual.condicoes,
		resultado: snapshot.resultado ?? atual.resultado,
		fontes: snapshot.fontes ?? atual.fontes,
		status: "pendente_revisao",
		versao: atual.versao + 1,
		validadoem: null,
		validadopor: null,
	});

	if (!registro) return httpNaoEncontrado();
	return httpOk(registro);
}
