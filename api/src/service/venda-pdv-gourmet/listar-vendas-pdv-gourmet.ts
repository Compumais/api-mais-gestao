import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarVendasPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarVendasPdvGourmetParametros = {
	idusuario: string;
	idempresa: string;
	idcontamesa?: string | undefined;
	numeropdv?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarVendasPdvGourmetResposta = {
	data: VendaPdvGourmet[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarVendasPdvGourmetService({
	idusuario,
	idempresa,
	idcontamesa,
	numeropdv,
	page = 1,
	limit = 10,
}: ListarVendasPdvGourmetParametros): Promise<
	HttpResponse<ListarVendasPdvGourmetResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarVendasPdvGourmet({
		idempresa,
		idcontamesa,
		numeropdv,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarVendasPdvGourmetResposta>({
		data: resultado.vendas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
