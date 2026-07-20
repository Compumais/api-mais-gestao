import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { normalizarConfiguracaoNotificacoes } from "@/worker/util/configuracao-notificacoes.js";

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

	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	if (!configuracao) {
		configuracao = await criarConfiguracao({ idempresa });
	}

	return httpOk({
		...configuracao,
		notificacoes: normalizarConfiguracaoNotificacoes(configuracao.notificacoes),
	});
}
