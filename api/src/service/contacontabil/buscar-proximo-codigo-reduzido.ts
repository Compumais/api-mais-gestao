import type { HttpResponse } from "@/model/http-model.js";
import { buscarProximoCodigoReduzidoContaContabil } from "@/repositories/conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type BuscarProximoCodigoReduzidoParametros = {
	idusuario: string;
	idempresa: string;
};

export async function buscarProximoCodigoReduzidoService({
	idusuario,
	idempresa,
}: BuscarProximoCodigoReduzidoParametros): Promise<
	HttpResponse<{ codigo: string }>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const codigo = await buscarProximoCodigoReduzidoContaContabil(idempresa);
	return httpOk({ codigo });
}
