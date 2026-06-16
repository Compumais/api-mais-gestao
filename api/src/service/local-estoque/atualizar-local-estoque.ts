import type { HttpResponse } from "@/model/http-model.js";
import type { LocalEstoque } from "@/model/local-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarLocalEstoque,
	buscarLocalEstoquePorId,
} from "@/repositories/local-estoque-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarLocalEstoqueParametros = {
	localEstoqueId: string;
	idusuario: string;
	dados: {
		codigo?: string | null | undefined;
		descricao?: string | null | undefined;
		inativo?: number | null | undefined;
		posse?: string | null | undefined;
		tipo?: number | null | undefined;
	};
};

export async function atualizarLocalEstoqueService({
	localEstoqueId,
	idusuario,
	dados,
}: AtualizarLocalEstoqueParametros): Promise<HttpResponse<LocalEstoque | null>> {
	const registroExistente = await buscarLocalEstoquePorId(localEstoqueId);

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

	const registroAtualizado = await atualizarLocalEstoque(localEstoqueId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<LocalEstoque>(registroAtualizado);
}
