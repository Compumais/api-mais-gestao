import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import {
	listarFinanceiro,
	type OrdenarFinanceirosCampo,
} from "@/repositories/financeiro-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarFinanceirosParametros = {
	idusuario: string;
	saldo?: string | null | undefined;
	emissao?: string | null | undefined;
	documento?: string | null | undefined;
	emitente?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	ordenarPor?: OrdenarFinanceirosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
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
	documento,
	emitente,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	status,
	tipo,
	ordenarPor,
	ordem,
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
		documento,
		emitente,
		emissaoInicio,
		emissaoFim,
		vencimentoInicio,
		vencimentoFim,
		status,
		tipo,
		ordenarPor,
		ordem,
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
