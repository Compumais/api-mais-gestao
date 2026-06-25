import type { TaxaUf } from "@/model/taxauf-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarTaxaUfPorId } from "@/repositories/taxauf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarTaxaUfParametros = {
	id: string;
	idusuario: string;
	idempresa: string;
};

export async function buscarTaxaUfService({
	id,
	idusuario,
	idempresa,
}: BuscarTaxaUfParametros): Promise<HttpResponse<TaxaUf | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await buscarTaxaUfPorId(id);

	if (!registro || registro.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	return httpOk<TaxaUf>(registro);
}
