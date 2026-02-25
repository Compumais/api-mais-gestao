import type { HttpResponse } from "@/model/http-model.js";
import type { NovaConfiguracao } from "@/model/configuracao-model.js";
import {
	atualizarConfiguracao,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

interface AtualizarConfiguracaoParametros {
	idempresa: string;
	idusuario: string;
	dados: Partial<NovaConfiguracao>;
}

export async function atualizarConfiguracaoService({
	idempresa,
	idusuario,
	dados,
}: AtualizarConfiguracaoParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	// Buscar configuração existente
	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	// Se não existir, criar uma nova
	if (!configuracao) {
		configuracao = await criarConfiguracao({
			idempresa,
			...dados,
		});
	} else {
		// Atualizar existente
		configuracao = await atualizarConfiguracao({
			id: configuracao.id,
			dados,
		});
	}

	return httpOk(configuracao);
}

