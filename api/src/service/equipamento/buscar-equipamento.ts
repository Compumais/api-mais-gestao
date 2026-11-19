import type { Equipamento } from "@/model/equipamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarEquipamentoPorIdEempresa } from "@/repositories/equipamento-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function buscarEquipamentoService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<Equipamento | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const registro = await buscarEquipamentoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!registro) return httpNaoEncontrado("Equipamento não encontrado");
	return httpOk(registro);
}
