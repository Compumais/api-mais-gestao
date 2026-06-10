import { v4 as uuidv4 } from "uuid";
import type {
	CondicaoPagamento,
	NovoCondicaoPagamento,
} from "@/model/condicao-pagamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCondicaoPagamento,
	buscarCondicaoPagamentoPorId,
} from "@/repositories/condicao-pagamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCondicaoPagamentoParametros = {
	condicaoPagamentoId: string;
	idusuario: string;
	dados: Partial<NovoCondicaoPagamento>;
};

export async function atualizarCondicaoPagamentoService({
	condicaoPagamentoId,
	idusuario,
	dados,
}: AtualizarCondicaoPagamentoParametros): Promise<
	HttpResponse<CondicaoPagamento | null>
> {
	const registroExistente =
		await buscarCondicaoPagamentoPorId(condicaoPagamentoId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarCondicaoPagamento(
		condicaoPagamentoId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_condicao_pagamento",
		idusuario,
		recurso: "condicao_pagamento",
		idrecurso: condicaoPagamentoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CondicaoPagamento>(registroAtualizado);
}
