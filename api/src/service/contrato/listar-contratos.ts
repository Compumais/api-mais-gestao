import type { Contrato } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarContratos,
	type ListarContratosParametros,
	type OrdenarContratosCampo,
} from "@/repositories/contrato-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarContratosServiceParametros = ListarContratosParametros & {
	idusuario: string;
};

export async function listarContratosService({
	idusuario,
	...filtros
}: ListarContratosServiceParametros): Promise<
	HttpResponse<{
		data: Contrato[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		filtros.idempresa,
	);
	if (!pertence) return httpProibido();

	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const resultado = await listarContratos({
		...filtros,
		page,
		limit,
		ordenarPor: filtros.ordenarPor as OrdenarContratosCampo | undefined,
	});

	return httpOk({
		data: resultado.contratos,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages: Math.ceil(resultado.total / limit) || 1,
		},
	});
}
