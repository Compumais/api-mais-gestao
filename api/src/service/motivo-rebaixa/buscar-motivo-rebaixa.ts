import type { HttpResponse } from "@/model/http-model.js";
import type { MotivoRebaixa } from "@/model/motivo-rebaixa-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarMotivoRebaixaPorId } from "@/repositories/motivo-rebaixa-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarMotivoRebaixaParametros = {
	motivoRebaixaId: string;
	idusuario: string;
};

export async function buscarMotivoRebaixaService({
	motivoRebaixaId,
	idusuario,
}: BuscarMotivoRebaixaParametros): Promise<HttpResponse<MotivoRebaixa | null>> {
	const registro = await buscarMotivoRebaixaPorId(motivoRebaixaId);

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

	return httpOk<MotivoRebaixa>(registro);
}
