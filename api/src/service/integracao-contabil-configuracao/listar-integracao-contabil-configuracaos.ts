import type { IntegracaoContabilConfiguracao } from "@/model/integracao-contabil-configuracao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarIntegracoesContabilConfiguracao } from "@/repositories/integracao-contabil-configuracao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarIntegracaoContabilConfiguracaosParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarIntegracaoContabilConfiguracaosResposta = {
	data: IntegracaoContabilConfiguracao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarIntegracaoContabilConfiguracaosService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarIntegracaoContabilConfiguracaosParametros): Promise<
	HttpResponse<ListarIntegracaoContabilConfiguracaosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarIntegracoesContabilConfiguracao({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarIntegracaoContabilConfiguracaosResposta>({
		data: resultado.integracoescontabilconfiguracao,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
