import type { EnquatramentoIPI } from "@/model/enquantramento-ipi-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEnquatramentoIpiPorId } from "@/repositories/enquatramento-ipi-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarEnquatramentoIpiParametros = {
	enquatramentoIpiId: string;
	idusuario: string;
};

export async function buscarEnquatramentoIpiService({
	enquatramentoIpiId,
	idusuario,
}: BuscarEnquatramentoIpiParametros): Promise<
	HttpResponse<EnquatramentoIPI | null>
> {
	const registro = await buscarEnquatramentoIpiPorId(enquatramentoIpiId);

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

	return httpOk<EnquatramentoIPI>(registro);
}
