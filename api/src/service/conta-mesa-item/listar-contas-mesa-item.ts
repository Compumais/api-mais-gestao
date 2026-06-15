import type { ContaMesaItem } from "@/model/conta-mesa-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import { listarContasMesaItem } from "@/repositories/conta-mesa-item-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type ListarContasMesaItemParametros = {
	idusuario: string;
	idcontamesa: string;
	page?: number;
	limit?: number;
};

type ListarContasMesaItemResposta = {
	data: ContaMesaItem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarContasMesaItemService({
	idusuario,
	idcontamesa,
	page = 1,
	limit = 10,
}: ListarContasMesaItemParametros): Promise<
	HttpResponse<ListarContasMesaItemResposta>
> {
	const contaMesa = await buscarContaMesaPorId(idcontamesa);

	if (!contaMesa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaMesa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarContasMesaItem({
		idcontamesa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarContasMesaItemResposta>({
		data: resultado.itens,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
