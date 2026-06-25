import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarParametrizacaoTributosPorId,
	type ParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarParametrizacaoTributosParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function buscarParametrizacaoTributosService({
	id,
	idempresa,
	idusuario,
}: BuscarParametrizacaoTributosParametros): Promise<
	HttpResponse<ParametrizacaoTributos | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await buscarParametrizacaoTributosPorId(id);

	if (!registro || registro.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	return httpOk<ParametrizacaoTributos>(registro);
}
