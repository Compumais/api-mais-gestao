import type { HttpResponse } from "@/model/http-model";
import { buscarConfiguracaoPorEmpresa } from "@/repositories/configuracao-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

interface BuscarConfiguracaoParametros {
	idempresa: string;
	idusuario: string;
}

export async function buscarConfiguracaoService({
	idempresa,
	idusuario,
}: BuscarConfiguracaoParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	if (!configuracao) {
		return httpNaoEncontrado();
	}

	return httpOk(configuracao);
}

