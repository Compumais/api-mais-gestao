import type { CodigoReduzidoContaContabil } from "@/model/codigo-reduzido-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCodigoReduzidoContaContabilPorId } from "@/repositories/codigo-reduzido-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCodigoReduzidoContaContabilParametros = {
	codigoReduzidoContaContabilId: string;
	idusuario: string;
};

export async function buscarCodigoReduzidoContaContabilService({
	codigoReduzidoContaContabilId,
	idusuario,
}: BuscarCodigoReduzidoContaContabilParametros): Promise<
	HttpResponse<CodigoReduzidoContaContabil | null>
> {
	const registro = await buscarCodigoReduzidoContaContabilPorId(
		codigoReduzidoContaContabilId,
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

	return httpOk<CodigoReduzidoContaContabil>(registro);
}
