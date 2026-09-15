import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type DestinoTipoDocumentoFinanceiroFiltro,
	listarTiposDocumentoFinanceiro,
	type OrdenarTiposDocumentoFinanceiroCampo,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTipoDocumentoFinanceirosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	formapagamentonfe?: string | undefined;
	prazodias?: string | undefined;
	destino?: DestinoTipoDocumentoFinanceiroFiltro | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarTiposDocumentoFinanceiroCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarTipoDocumentoFinanceirosResposta = {
	data: TipoDocumentoFinanceiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTipoDocumentoFinanceirosService({
	idusuario,
	idempresa,
	descricao,
	formapagamentonfe,
	prazodias,
	destino,
	inativo,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarTipoDocumentoFinanceirosParametros): Promise<
	HttpResponse<ListarTipoDocumentoFinanceirosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTiposDocumentoFinanceiro({
		idempresa,
		descricao,
		formapagamentonfe,
		prazodias,
		destino,
		inativo,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarTipoDocumentoFinanceirosResposta>({
		data: resultado.tiposdocumentofinanceiro,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
