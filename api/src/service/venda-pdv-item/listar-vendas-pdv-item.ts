import type { VendaPdvItem } from "@/model/venda-pdv-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarVendasPdvItem } from "@/repositories/venda-pdv-item-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarVendasPdvItemParametros = {
	idusuario: string;
	idempresa: string;
	idvenda?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarVendasPdvItemResposta = {
	data: VendaPdvItem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarVendasPdvItemService({
	idusuario,
	idempresa,
	idvenda,
	page = 1,
	limit = 10,
}: ListarVendasPdvItemParametros): Promise<
	HttpResponse<ListarVendasPdvItemResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarVendasPdvItem({
		idempresa,
		idvenda,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarVendasPdvItemResposta>({
		data: resultado.itens,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
