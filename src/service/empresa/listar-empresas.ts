import { listarEmpresas } from "../../models/empresa-model";

type ListarEmpresasParametros = {
	proprietarioId?: string | null;
};

export async function listarEmpresasService({
	proprietarioId,
}: ListarEmpresasParametros) {
	const empresas = await listarEmpresas({
		proprietarioId: proprietarioId ?? null,
	});

	return empresas;
}
