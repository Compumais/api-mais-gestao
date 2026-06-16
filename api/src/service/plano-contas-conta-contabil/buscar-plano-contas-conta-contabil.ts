import type { PlanoContasContaContabil } from "@/model/plano-contas-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPlanoContasContaContabilPorId } from "@/repositories/plano-contas-conta-contabil-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarPlanoContasContaContabilParametros = {
	planoContasContaContabilId: string;
	idusuario: string;
};

export async function buscarPlanoContasContaContabilService({
	planoContasContaContabilId,
	idusuario,
}: BuscarPlanoContasContaContabilParametros): Promise<
	HttpResponse<PlanoContasContaContabil | null>
> {
	const registro = await buscarPlanoContasContaContabilPorId(
		planoContasContaContabilId,
	);

	if (!registro) {
		return httpNaoEncontrado();
	}

	if (!registro.idempresa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<PlanoContasContaContabil>(registro);
}
