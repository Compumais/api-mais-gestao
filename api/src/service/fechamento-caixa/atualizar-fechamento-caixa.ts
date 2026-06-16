import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type AtualizarFechamentoCaixaDados,
	atualizarFechamentoCaixa,
	buscarFechamentoCaixaPorId,
} from "@/repositories/fechamento-caixa-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarFechamentoCaixaParametros = {
	fechamentoCaixaId: number;
	idusuario: string;
	dados: AtualizarFechamentoCaixaDados;
};

export async function atualizarFechamentoCaixaService({
	fechamentoCaixaId,
	idusuario,
	dados,
}: AtualizarFechamentoCaixaParametros): Promise<
	HttpResponse<FechamentoCaixa | null>
> {
	const registroExistente = await buscarFechamentoCaixaPorId(fechamentoCaixaId);

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

	const registroAtualizado = await atualizarFechamentoCaixa(fechamentoCaixaId, {
		...dados,
		datamodificacao: new Date(),
	});

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<FechamentoCaixa>(registroAtualizado);
}
