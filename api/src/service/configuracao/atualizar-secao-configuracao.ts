import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarConfiguracaoParcial,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	type SecaoConfiguracao,
	validarDadosSecaoConfiguracao,
} from "./validar-configuracao.js";
import { normalizarConfiguracaoNotificacoes } from "@/worker/util/configuracao-notificacoes.js";

interface AtualizarSecaoConfiguracaoParametros {
	idempresa: string;
	idusuario: string;
	secao: SecaoConfiguracao;
	dados: unknown;
}

export async function atualizarSecaoConfiguracaoService({
	idempresa,
	idusuario,
	secao,
	dados,
}: AtualizarSecaoConfiguracaoParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dadosValidados = validarDadosSecaoConfiguracao(secao, dados);

	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	if (!configuracao) {
		configuracao = await criarConfiguracao({
			idempresa,
			[secao]: dadosValidados,
		});
	} else {
		configuracao = await atualizarConfiguracaoParcial({
			idempresa,
			secao,
			dados: dadosValidados,
			substituir: true,
		});
	}

	if (secao === "notificacoes" && configuracao) {
		return httpOk({
			...configuracao,
			notificacoes: normalizarConfiguracaoNotificacoes(
				configuracao.notificacoes,
			),
		});
	}

	return httpOk(configuracao);
}
