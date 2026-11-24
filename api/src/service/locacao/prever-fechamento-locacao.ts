import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocacaoPorIdEempresa,
	listarItensLocacao,
} from "@/repositories/locacao-repositories.js";
import {
	calcularFechamentoLocacao,
	type PreviaFechamentoLocacao,
} from "@/service/locacao/calcular-fechamento-locacao.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { dataIsoValida, diferencaDiasIso } from "@/util/locacao-calculo.js";

export async function preverFechamentoLocacaoService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
	datadevolucao: string;
}): Promise<HttpResponse<PreviaFechamentoLocacao | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();
	if (!dataIsoValida(parametros.datadevolucao)) {
		return httpBadRequest("Data de devolução inválida");
	}

	const atual = await buscarLocacaoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!atual) return httpNaoEncontrado("Locação não encontrada");
	if (atual.locacao.situacao !== "aberta") {
		return httpBadRequest("Somente locação aberta pode ser fechada");
	}
	if (
		diferencaDiasIso(atual.locacao.datainicio, parametros.datadevolucao) < 0
	) {
		return httpBadRequest("Data de devolução anterior ao início da locação");
	}

	const itens = await listarItensLocacao(atual.locacao.id);
	return httpOk(
		calcularFechamentoLocacao({
			datainicio: atual.locacao.datainicio,
			datadevolucao: parametros.datadevolucao,
			itens,
		}),
	);
}
