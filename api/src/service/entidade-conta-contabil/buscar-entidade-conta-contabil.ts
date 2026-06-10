import type { EntidadeContaContabil } from "@/model/entidade-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEntidadeContaContabilPorId } from "@/repositories/entidade-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarEntidadeContaContabilParametros = {
	entidadeContaContabilId: string;
	idusuario: string;
};

export async function buscarEntidadeContaContabilService({
	entidadeContaContabilId,
	idusuario,
}: BuscarEntidadeContaContabilParametros): Promise<
	HttpResponse<EntidadeContaContabil | null>
> {
	const registro = await buscarEntidadeContaContabilPorId(
		entidadeContaContabilId,
	);

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

	return httpOk<EntidadeContaContabil>(registro);
}
