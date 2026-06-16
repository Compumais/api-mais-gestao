import type { HttpResponse } from "@/model/http-model.js";
import type { LocalEstoque } from "@/model/local-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocalEstoquePorId,
} from "@/repositories/local-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarLocalEstoqueParametros = {
	localEstoqueId: string;
	idusuario: string;
};

export async function buscarLocalEstoqueService({
	localEstoqueId,
	idusuario,
}: BuscarLocalEstoqueParametros): Promise<HttpResponse<LocalEstoque | null>> {
	const registro = await buscarLocalEstoquePorId(localEstoqueId);

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

	return httpOk<LocalEstoque>(registro);
}
