import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories";
import { listarPlanoContasPorEmpresas } from "@/repositories/plano-contas-repositories";
import { httpOk } from "@/util/http-util";

type ListarPlanoContasParametros = {
	idusuario: string;
	idplanocontas?: string | undefined;
	idempresa: string;
	inativo?: boolean;
	page?: number;
	limit?: number;
	listarTudo?: boolean;
	tipomovimento?: "E" | "S";
};

type ListarPlanoContasResposta = {
	data: PlanoContas[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarPlanoContasService({
	idusuario,
	idempresa,
	idplanocontas,
	inativo,
	page = 1,
	limit = 10,
	listarTudo = false,
	tipomovimento,
}: ListarPlanoContasParametros): Promise<
	HttpResponse<ListarPlanoContasResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpOk<ListarPlanoContasResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const inativoFiltro = inativo ? 1 : 0; // 0 para ativo, 1 para inativo

	const { planosContas, total } = await listarPlanoContasPorEmpresas({
		idempresas: [idempresa],
		idplanocontas,
		inativo: inativoFiltro,
		page,
		limit,
		listarTudo,
		tipomovimento,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarPlanoContasResposta>({
		data: planosContas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
