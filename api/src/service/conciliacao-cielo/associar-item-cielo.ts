import type { HttpResponse } from "@/model/http-model.js";
import type { ConciliacaoCieloItem } from "@/model/conciliacao-cielo-model.js";
import { STATUS_CONCILIACAO_CIELO_ITEM } from "@/model/conciliacao-cielo-model.js";
import {
	atualizarItemConciliacaoCielo,
	buscarConciliacaoCieloPorIdEempresa,
	buscarItemConciliacaoCieloPorId,
} from "@/repositories/conciliacao-cielo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export async function associarItemConciliacaoCieloService(parametros: {
	iditem: string;
	idempresa: string;
	idusuario: string;
	idfinanceiro: string | null;
}): Promise<HttpResponse<ConciliacaoCieloItem>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const item = await buscarItemConciliacaoCieloPorId(parametros.iditem);
	if (!item) return httpNaoEncontrado("Item não encontrado");

	const conciliacao = await buscarConciliacaoCieloPorIdEempresa(
		item.idconciliacao,
		parametros.idempresa,
	);
	if (!conciliacao) return httpNaoEncontrado("Conciliação não encontrada");

	if (item.statusprocessamento === STATUS_CONCILIACAO_CIELO_ITEM.CONFIRMADO) {
		return httpBadRequest("Item já confirmado");
	}

	if (!parametros.idfinanceiro) {
		const atualizado = await atualizarItemConciliacaoCielo(item.id, {
			idfinanceiro: null,
			statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.PENDENTE,
			mensagemerro: null,
		});
		return httpOk(atualizado);
	}

	const titulo = await buscarFinanceiroPorId(parametros.idfinanceiro);
	if (
		!titulo ||
		titulo.idempresa !== parametros.idempresa ||
		titulo.tipo !== "R"
	) {
		return httpBadRequest("Conta a receber não encontrada");
	}

	const atualizado = await atualizarItemConciliacaoCielo(item.id, {
		idfinanceiro: titulo.id,
		statusprocessamento: STATUS_CONCILIACAO_CIELO_ITEM.ASSOCIADO,
		mensagemerro: "Associação manual",
	});
	return httpOk(atualizado);
}
