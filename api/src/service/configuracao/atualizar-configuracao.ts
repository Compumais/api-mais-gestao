import type { HttpResponse } from "@/model/http-model.js";
import type { NovaConfiguracao } from "@/model/configuracao-model.js";
import {
	atualizarConfiguracao,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { validarEParsearConfiguracaoNotificacoes } from "./validar-configuracao.js";
import { normalizarConfiguracaoNotificacoes } from "@/worker/util/configuracao-notificacoes.js";

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

	const dadosAtualizacao: Partial<NovaConfiguracao> = { ...dados };

	if (dados.notificacoes !== undefined) {
		dadosAtualizacao.notificacoes = validarEParsearConfiguracaoNotificacoes(
			dados.notificacoes,
		);
	}

	// Buscar configuração existente
	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	// Se não existir, criar uma nova
	if (!configuracao) {
		configuracao = await criarConfiguracao({
			idempresa,
			...dadosAtualizacao,
		});
	} else {
		// Atualizar existente
		configuracao = await atualizarConfiguracao({
			id: configuracao.id,
			dados: dadosAtualizacao,
		});
	}

	if (configuracao?.notificacoes) {
		return httpOk({
			...configuracao,
			notificacoes: normalizarConfiguracaoNotificacoes(configuracao.notificacoes),
		});
	}

	return httpOk(configuracao);
}
