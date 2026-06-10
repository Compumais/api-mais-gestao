import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarTipoDocumentoFinanceiroParametros = {
	tipoDocumentoFinanceiroId: string;
	idusuario: string;
};

export async function buscarTipoDocumentoFinanceiroService({
	tipoDocumentoFinanceiroId,
	idusuario,
}: BuscarTipoDocumentoFinanceiroParametros): Promise<
	HttpResponse<TipoDocumentoFinanceiro | null>
> {
	const registro = await buscarTipoDocumentoFinanceiroPorId(
		tipoDocumentoFinanceiroId,
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

	return httpOk<TipoDocumentoFinanceiro>(registro);
}
