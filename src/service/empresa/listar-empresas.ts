import type { HttpResponse } from "../../model/http-model";
import { listarEmpresas, type Empresa } from "../../repositories/empresa-model";
import { httpOk } from "../../util/http-util";

type ListarEmpresasParametros = {
	proprietarioId?: string | null;
};

export async function listarEmpresasService({
	proprietarioId,
}: ListarEmpresasParametros): Promise<HttpResponse<Empresa[]>> {
	const empresas = await listarEmpresas({
		proprietarioId: proprietarioId ?? null,
	});

	return httpOk<Empresa[]>(empresas);
}
