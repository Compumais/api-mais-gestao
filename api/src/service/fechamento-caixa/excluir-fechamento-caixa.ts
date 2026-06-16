import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFechamentoCaixaPorId,
	excluirFechamentoCaixa,
} from "@/repositories/fechamento-caixa-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirFechamentoCaixaParametros = {
	fechamentoCaixaId: number;
	idusuario: string;
};

export async function excluirFechamentoCaixaService({
	fechamentoCaixaId,
	idusuario,
}: ExcluirFechamentoCaixaParametros): Promise<
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

	const registroExcluido = await excluirFechamentoCaixa(fechamentoCaixaId);

	if (!registroExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
