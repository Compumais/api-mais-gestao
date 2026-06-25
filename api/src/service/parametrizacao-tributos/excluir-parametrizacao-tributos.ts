import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarParametrizacaoTributosPorId,
	excluirParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirParametrizacaoTributosParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function excluirParametrizacaoTributosService({
	id,
	idempresa,
	idusuario,
}: ExcluirParametrizacaoTributosParametros): Promise<HttpResponse<null>> {
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

	await excluirParametrizacaoTributos(id);

	return httpSemConteudo();
}
