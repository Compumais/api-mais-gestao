import type { Financeiro } from "@/model/financeiro-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories";
import { listarFinanceiro } from "@/repositories/financeiro-repositories";
import { httpOk } from "@/util/http-util";

type ListarFinanceirosParametros = {
	idusuario: string;
	saldo?: string | null | undefined;
	emissao?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	page?: number;
	limit?: number;
};

type ListarFinanceirosResposta = {
	data: Financeiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarFinanceirosService({
	idusuario,
	saldo,
	emissao,
	tipo,
	page = 1,
	limit = 10,
}: ListarFinanceirosParametros): Promise<
	HttpResponse<ListarFinanceirosResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpOk<ListarFinanceirosResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { financeiros, total } = await listarFinanceiro({
		idempresas,
		saldo,
		emissao,
		tipo,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarFinanceirosResposta>({
		data: financeiros,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
