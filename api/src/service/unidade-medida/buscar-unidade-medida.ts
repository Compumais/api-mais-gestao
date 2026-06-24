import type { HttpResponse } from "@/model/http-model.js";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarUnidadeMedidaPorId } from "@/repositories/unidade-medida-repositories.js";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaPertenceEmpresa,
} from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarUnidadeMedidaParametros = {
	unidadeMedidaId: string;
	idusuario: string;
	idempresa?: string;
};

export async function buscarUnidadeMedidaService({
	unidadeMedidaId,
	idusuario,
	idempresa,
}: BuscarUnidadeMedidaParametros): Promise<HttpResponse<UnidadeMedida | null>> {
	const registro = await buscarUnidadeMedidaPorId(unidadeMedidaId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	if (isUnidadeMedidaGlobal(registro)) {
		return httpOk<UnidadeMedida>(registro);
	}

	if (idempresa) {
		if (!unidadeMedidaPertenceEmpresa(registro, idempresa)) {
			return httpProibido();
		}

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}

		return httpOk<UnidadeMedida>(registro);
	}

	if (!registro.idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<UnidadeMedida>(registro);
}
