import type { HttpResponse } from "@/model/http-model.js";
import type { ServicoNfse } from "@/model/servico-nfse-model.js";
import { listarServicosNfse } from "@/repositories/servicos-nfse-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarServicosNfseParametros = {
	q?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarServicosNfseResposta = {
	data: ServicoNfse[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarServicosNfseService({
	q,
	page = 1,
	limit = 20,
}: ListarServicosNfseParametros): Promise<
	HttpResponse<ListarServicosNfseResposta>
> {
	const resultado = await listarServicosNfse({ q, page, limit });

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarServicosNfseResposta>({
		data: resultado.servicos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
