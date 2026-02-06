import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model";
import {
	atualizarConfiguracaoParcial,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpOk, httpProibido } from "@/util/http-util";

interface CriarWebhookParametros {
	idempresa: string;
	idusuario: string;
	url: string;
	eventos: string[];
}

export async function criarWebhookService({
	idempresa,
	idusuario,
	url,
	eventos,
}: CriarWebhookParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	// Validar URL
	try {
		new URL(url);
	} catch {
		return {
			success: false,
			status: 400,
			error: {
				error: "URL inválida",
				code: "INVALID_URL",
			},
		};
	}

	const novoWebhook = {
		id: uuidv4(),
		url,
		eventos,
		ativo: true,
		criadoEm: new Date().toISOString(),
	};

	// Buscar configuração existente
	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	if (!configuracao) {
		// Criar nova configuração com o webhook
		configuracao = await criarConfiguracao({
			idempresa,
			integracao: {
				apis: {
					chaves: [],
				},
				webhooks: [novoWebhook],
				integracoesBancos: {
					habilitado: false,
					provedor: null,
					configuracoes: {},
				},
				exportacao: {
					formatoPadrao: "csv",
					incluirCabecalho: true,
					separador: ",",
				},
				backup: {
					habilitado: false,
					frequencia: null,
					horario: "00:00",
					manterBackups: 30,
				},
			},
		});
	} else {
		// Adicionar webhook ao array existente
		const integracaoAtual = (configuracao.integracao as {
			webhooks?: unknown[];
		}) || { webhooks: [] };

		const webhooksExistentes = integracaoAtual.webhooks || [];

		await atualizarConfiguracaoParcial({
			idempresa,
			secao: "integracao",
			dados: {
				webhooks: [...webhooksExistentes, novoWebhook],
			},
		});
	}

	return httpOk(novoWebhook);
}

