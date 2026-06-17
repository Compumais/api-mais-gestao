import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import { buscarUnidadeMedidaPorId } from "@/repositories/unidade-medida-repositories.js";

export function isUnidadeMedidaGlobal(unidade: Pick<UnidadeMedida, "idempresa">) {
	return unidade.idempresa === null;
}

export function unidadeMedidaPertenceEmpresa(
	unidade: Pick<UnidadeMedida, "idempresa">,
	idempresa: string,
) {
	return isUnidadeMedidaGlobal(unidade) || unidade.idempresa === idempresa;
}

export async function validarUnidadeMedidaParaEmpresa(
	idunidademedida: string,
	idempresa: string,
): Promise<boolean> {
	const unidade = await buscarUnidadeMedidaPorId(idunidademedida);

	if (!unidade) {
		return false;
	}

	return unidadeMedidaPertenceEmpresa(unidade, idempresa);
}
