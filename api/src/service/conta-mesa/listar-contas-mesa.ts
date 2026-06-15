import type { ContaMesa } from "@/model/conta-mesa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarContasMesa } from "@/repositories/conta-mesa-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarContasMesaParametros = {
	idusuario: string;
	idempresa: string;
	numeromesa?: number | undefined;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarContasMesaResposta = {
	data: ContaMesa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarContasMesaService({
	idusuario,
	idempresa,
	numeromesa,
	status,
	page = 1,
	limit = 10,
}: ListarContasMesaParametros): Promise<HttpResponse<ListarContasMesaResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarContasMesa({
		idempresa,
		numeromesa,
		status,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarContasMesaResposta>({
		data: resultado.contas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
