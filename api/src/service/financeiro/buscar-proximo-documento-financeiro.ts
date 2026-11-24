import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProximoCodigoDocumentoFinanceiro } from "@/repositories/proximo-codigo-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type BuscarProximoDocumentoFinanceiroParametros = {
	idusuario: string;
	idempresa: string;
	tipo: "P" | "R";
};

export async function buscarProximoDocumentoFinanceiroService({
	idusuario,
	idempresa,
	tipo,
}: BuscarProximoDocumentoFinanceiroParametros): Promise<
	HttpResponse<{ codigo: string }>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const codigo = await buscarProximoCodigoDocumentoFinanceiro(idempresa, tipo);
	return httpOk({ codigo });
}
