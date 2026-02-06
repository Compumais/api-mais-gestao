import type { HttpResponse } from "@/model/http-model";
import type { NovaConfiguracao } from "@/model/configuracao-model";
import {
	atualizarConfiguracao,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpOk, httpProibido } from "@/util/http-util";

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

