import type { ContaContabil } from "@/model/conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarContasContabeis,
	type OrdenarContaContabilCampo,
	type SituacaoCodigoReduzido,
} from "@/repositories/conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarContasContabeisParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	q?: string | undefined;
	codigoreduzido?: string | undefined;
	codigoextenso?: string | undefined;
	natureza?: string | undefined;
	tipocontacontabil?: string | undefined;
	inativo?: number | undefined;
	situacaoCodigo?: SituacaoCodigoReduzido | undefined;
	ordenarPor?: OrdenarContaContabilCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarContasContabeisResposta = {
	data: ContaContabil[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarContasContabeisService({
	idusuario,
	idempresa,
	descricao,
	q,
	codigoreduzido,
	codigoextenso,
	natureza,
	tipocontacontabil,
	inativo,
	situacaoCodigo,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarContasContabeisParametros): Promise<
	HttpResponse<ListarContasContabeisResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarContasContabeisResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { contasContabeis, total } = await listarContasContabeis({
		idempresa,
		descricao,
		q,
		codigoreduzido,
		codigoextenso,
		natureza,
		tipocontacontabil,
		inativo,
		situacaoCodigo,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarContasContabeisResposta>({
		data: contasContabeis,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
