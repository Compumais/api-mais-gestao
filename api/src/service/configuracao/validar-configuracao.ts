import type {
	ConfiguracaoImpressao,
	ConfiguracaoIntegracao,
	ConfiguracaoNotificacoes,
	ConfiguracaoRelatorios,
} from "@/model/configuracao-model.js";
import { parseConfiguracaoNotificacoes } from "@/schemas/configuracao-notificacoes-schema.js";

export type SecaoConfiguracao =
	| "notificacoes"
	| "integracao"
	| "relatorios"
	| "impressao";

export function validarConfiguracaoNotificacoes(
	dados: unknown,
): dados is ConfiguracaoNotificacoes {
	try {
		parseConfiguracaoNotificacoes(dados);
		return true;
	} catch {
		return false;
	}
}

export function validarEParsearConfiguracaoNotificacoes(
	dados: unknown,
): ConfiguracaoNotificacoes {
	return parseConfiguracaoNotificacoes(dados);
}

export function validarConfiguracaoIntegracao(
	dados: unknown,
): dados is Partial<ConfiguracaoIntegracao> {
	if (!dados || typeof dados !== "object") {
		return false;
	}

	const obj = dados as Record<string, unknown>;

	if (obj.apis && typeof obj.apis !== "object") {
		return false;
	}

	if (obj.webhooks && !Array.isArray(obj.webhooks)) {
		return false;
	}

	return true;
}

export function validarConfiguracaoRelatorios(
	dados: unknown,
): dados is Partial<ConfiguracaoRelatorios> {
	if (!dados || typeof dados !== "object") {
		return false;
	}

	const obj = dados as Record<string, unknown>;

	if (obj.templates && !Array.isArray(obj.templates)) {
		return false;
	}

	if (obj.padroes && typeof obj.padroes !== "object") {
		return false;
	}

	return true;
}

export function validarConfiguracaoImpressao(
	dados: unknown,
): dados is Partial<ConfiguracaoImpressao> {
	if (!dados || typeof dados !== "object") {
		return false;
	}

	return true;
}

export function validarDadosSecaoConfiguracao(
	secao: SecaoConfiguracao,
	dados: unknown,
):
	| ConfiguracaoNotificacoes
	| Partial<ConfiguracaoIntegracao>
	| Partial<ConfiguracaoRelatorios>
	| Partial<ConfiguracaoImpressao> {
	switch (secao) {
		case "notificacoes":
			return parseConfiguracaoNotificacoes(dados);
		case "integracao":
			if (!validarConfiguracaoIntegracao(dados)) {
				throw new Error("Dados de integração inválidos");
			}
			return dados;
		case "relatorios":
			if (!validarConfiguracaoRelatorios(dados)) {
				throw new Error("Dados de relatórios inválidos");
			}
			return dados;
		case "impressao":
			if (!validarConfiguracaoImpressao(dados)) {
				throw new Error("Dados de impressão inválidos");
			}
			return dados;
	}
}
