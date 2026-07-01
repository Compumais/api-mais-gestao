import type { HttpResponse } from "@/model/http-model.js";
import type { FatorConversao } from "@/model/fator-conversao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFatorConversaoPorId } from "@/repositories/fator-conversao-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarFatorConversaoParametros = {
	fatorConversaoId: string;
	idusuario: string;
};

export async function buscarFatorConversaoService({
	fatorConversaoId,
	idusuario,
}: BuscarFatorConversaoParametros): Promise<HttpResponse<FatorConversao | null>> {
	const registro = await buscarFatorConversaoPorId(fatorConversaoId);

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

	return httpOk<FatorConversao>(registro);
}
