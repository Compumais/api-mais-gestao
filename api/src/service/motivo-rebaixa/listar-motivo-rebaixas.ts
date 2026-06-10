import type { HttpResponse } from "@/model/http-model.js";
import type { MotivoRebaixa } from "@/model/motivo-rebaixa-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarMotivosRebaixa } from "@/repositories/motivo-rebaixa-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarMotivoRebaixasParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarMotivoRebaixasResposta = {
	data: MotivoRebaixa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarMotivoRebaixasService({
	idusuario,
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarMotivoRebaixasParametros): Promise<
	HttpResponse<ListarMotivoRebaixasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarMotivosRebaixa({
		idempresa,
		nome,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarMotivoRebaixasResposta>({
		data: resultado.motivorebaixas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
