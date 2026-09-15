import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { httpBadRequest } from "@/util/http-util.js";

export async function validarTipoDocumentoFinanceiroTipoCobranca(
	idtipodocumentofinanceiro: string,
	idempresa: string,
) {
	const tipoDocumentoFinanceiro = await buscarTipoDocumentoFinanceiroPorId(
		idtipodocumentofinanceiro,
	);

	if (
		!tipoDocumentoFinanceiro ||
		tipoDocumentoFinanceiro.idempresa !== idempresa
	) {
		return httpBadRequest(
			"Tipo de documento financeiro inválido para a empresa",
		);
	}

	return null;
}
