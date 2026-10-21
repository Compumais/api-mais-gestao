import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCriterioRateio,
	buscarCriterioRateioCompleto,
	criarCriterioRateio,
	substituirLinhasCriterioRateio,
} from "@/repositories/criterio-rateio-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { arredondarMoeda } from "@/util/apropriacao-centro-custo-util.js";

type LinhaInput = {
	idcentrocusto: string;
	percentual?: number | null;
	peso?: number | null;
	ordem?: number;
};

export async function salvarCriterioRateioService({
	idusuario,
	idempresa,
	id,
	nome,
	tipoparametro,
	ativo = 1,
	observacao,
	linhas,
}: {
	idusuario: string;
	idempresa: string;
	id?: string;
	nome: string;
	tipoparametro: string;
	ativo?: number;
	observacao?: string | null;
	linhas: LinhaInput[];
}): Promise<HttpResponse<unknown>> {
	const permitido = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!permitido) return httpProibido();

	if (tipoparametro === "percentual") {
		const soma = arredondarMoeda(
			linhas.reduce((acc, l) => acc + Number(l.percentual ?? 0), 0),
		);
		if (Math.abs(soma - 100) > 0.01) {
			return httpBadRequest("Percentuais do critério devem totalizar 100%.");
		}
	}

	const agora = new Date().toISOString();
	let criterioId = id;

	if (!criterioId) {
		criterioId = uuidv4();
		const criado = await criarCriterioRateio({
			id: criterioId,
			idempresa,
			nome,
			tipoparametro,
			ativo,
			observacao: observacao ?? null,
			idusuariocadastro: idusuario,
			idultimousuarioalteracao: idusuario,
			datacadastro: agora,
			dataultimaalteracao: agora,
		});
		if (!criado) return httpBadRequest("Erro ao criar critério de rateio.");
	} else {
		const atualizado = await atualizarCriterioRateio(criterioId, {
			nome,
			tipoparametro,
			ativo,
			observacao: observacao ?? null,
			idultimousuarioalteracao: idusuario,
			dataultimaalteracao: agora,
		});
		if (!atualizado) return httpNaoEncontrado();
	}

	await substituirLinhasCriterioRateio(
		idempresa,
		criterioId,
		linhas.map((linha, index) => ({
			id: uuidv4(),
			idempresa,
			idcriteriorateio: criterioId,
			idcentrocusto: linha.idcentrocusto,
			percentual:
				linha.percentual === undefined || linha.percentual === null
					? null
					: linha.percentual.toFixed(2),
			peso:
				linha.peso === undefined || linha.peso === null
					? null
					: String(linha.peso),
			ordem: linha.ordem ?? index,
		})),
	);

	const completo = await buscarCriterioRateioCompleto(criterioId);
	return id ? httpOk(completo) : httpCriacao(completo);
}
