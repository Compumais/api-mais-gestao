import type {
	ConfiguracaoImpressao,
	ConfiguracaoIntegracao,
	ConfiguracaoNotificacoes,
	ConfiguracaoRelatorios,
} from "@/model/configuracao-model.js";

export function validarConfiguracaoNotificacoes(
	dados: unknown,
): dados is Partial<ConfiguracaoNotificacoes> {
	if (!dados || typeof dados !== "object") {
		return false;
	}

	const obj = dados as Record<string, unknown>;

	// Validar estrutura básica
	if (obj.alertasFinanceiros && typeof obj.alertasFinanceiros !== "object") {
		return false;
	}

	if (obj.notificacoesEmail && typeof obj.notificacoesEmail !== "object") {
		return false;
	}

	return true;
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
