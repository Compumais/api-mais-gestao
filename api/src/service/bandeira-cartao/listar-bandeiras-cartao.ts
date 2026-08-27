import type { BandeiraCartao } from "@/model/bandeira-cartao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarBandeirasCartao,
	type OrdenarBandeirasCartaoCampo,
} from "@/repositories/bandeira-cartao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarBandeirasCartaoParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarBandeirasCartaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarBandeirasCartaoResposta = {
	data: BandeiraCartao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarBandeirasCartaoService({
	idusuario,
	idempresa,
	descricao,
	codigo,
	inativo,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarBandeirasCartaoParametros): Promise<
	HttpResponse<ListarBandeirasCartaoResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarBandeirasCartao({
		idempresa,
		descricao,
		codigo,
		inativo,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarBandeirasCartaoResposta>({
		data: resultado.bandeiras,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
