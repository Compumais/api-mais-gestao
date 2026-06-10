import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCondicaoPagamentoPorId,
	excluirCondicaoPagamento,
} from "@/repositories/condicao-pagamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCondicaoPagamentoParametros = {
	condicaoPagamentoId: string;
	idusuario: string;
};

export async function excluirCondicaoPagamentoService({
	condicaoPagamentoId,
	idusuario,
}: ExcluirCondicaoPagamentoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCondicaoPagamentoPorId(condicaoPagamentoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_condicao_pagamento",
		idusuario,
		recurso: "condicao_pagamento",
		idrecurso: condicaoPagamentoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCondicaoPagamento(condicaoPagamentoId);

	return httpSemConteudo();
}
