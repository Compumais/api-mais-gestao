import type { HttpResponse } from "@/model/http-model.js";
import type { MovimentoEstoque } from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarMovimentoEstoquePorId } from "@/repositories/movimento-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarMovimentoEstoqueParametros = {
	movimentoEstoqueId: number;
	idusuario: string;
};

export async function buscarMovimentoEstoqueService({
	movimentoEstoqueId,
	idusuario,
}: BuscarMovimentoEstoqueParametros): Promise<
	HttpResponse<MovimentoEstoque | null>
> {
	const registro = await buscarMovimentoEstoquePorId(movimentoEstoqueId);

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

	return httpOk<MovimentoEstoque>(registro);
}

