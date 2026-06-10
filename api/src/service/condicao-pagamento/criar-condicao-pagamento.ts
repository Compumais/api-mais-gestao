import { v4 as uuidv4 } from "uuid";
import type {
	CondicaoPagamento,
	NovoCondicaoPagamento,
} from "@/model/condicao-pagamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarCondicaoPagamento,
	excluirCondicaoPagamento,
} from "@/repositories/condicao-pagamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCondicaoPagamentoParametros = {
	dadosCondicaoPagamento: NovoCondicaoPagamento;
	idusuario: string;
};

export async function criarCondicaoPagamentoService({
	dadosCondicaoPagamento,
	idusuario,
}: CriarCondicaoPagamentoParametros): Promise<
	HttpResponse<CondicaoPagamento | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCondicaoPagamento.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCondicaoPagamento(dadosCondicaoPagamento);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_condicao_pagamento",
		idusuario,
		recurso: "condicao_pagamento",
		idrecurso: registro.id,
		idempresa: dadosCondicaoPagamento.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCondicaoPagamento(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CondicaoPagamento>(registro);
}
