import type { HttpResponse } from "../model/http-model.js";

export function httpCriacao<T>(body: T): HttpResponse<T> {
	return {
		success: true as const,
		status: 201,
		body,
	};
}

export function httpNaoAutorizado() {
	return {
		success: false,
		status: 401,
		error: "NÃ£o autorizado",
		code: "UNAUTHORIZED_ERROR",
	};
}

export function httpNaoEncontrado() {
	return {
		success: false,
		status: 404,
		error: "Recurso nÃ£o encontrado",
		code: "NOT_FOUND_ERROR",
	};
}
export function httpBadGateway(error?: string): HttpResponse<never> {
	return {
		success: false as const,
		status: 502,
		error: error || "Erro no serviÃ§o externo",
		code: "BAD_GATEWAY_ERROR",
	};
}

export function httpErroInterno() {
	return {
		success: false,
		status: 500,
		error: "Erro interno",
		code: "INTERNAL_SERVER_ERROR",
	};
}

export function httpRecursoExistente(error = "Recurso jÃ¡ existe") {
	return {
		success: false,
		status: 409,
		error,
		code: "RESOURCE_ALREADY_EXISTS",
	};
}

export function httpLimiteExcedido() {
	return {
		success: false,
		status: 429,
		error: "Limite excedido",
		code: "LIMIT_EXCEEDED",
	};
}

export function httpOk<T>(body: T): HttpResponse<T> {
	return {
		success: true as const,
		status: 200,
		body,
	};
}

export function httpSemConteudo(): HttpResponse<null> {
	return {
		success: true as const,
		status: 204,
		body: null,
	};
}

export function httpProibido(): HttpResponse<never> {
	return {
		success: false as const,
		status: 403,
		error: "Acesso proibido",
		code: "FORBIDDEN_ERROR",
	};
}

export function httpErro() {
	return {
		success: false,
		status: 400,
		error: "Erro ao processar a requisiÃ§Ã£o",
		code: "BAD_REQUEST_ERROR",
	};
}

export function httpBadRequest(
	error?: string | { error?: string },
	meta?: {
		cStat?: string;
		codigoErro?: string;
		consultaSituacao?: { cStat?: string; xMotivo?: string } | null;
	},
): HttpResponse<never> {
	const errorMessage =
		typeof error === "string"
			? error
			: error?.error || "RequisiÃ§Ã£o invÃ¡lida";

	return {
		success: false as const,
		status: 400,
		error: errorMessage,
		code: "BAD_REQUEST_ERROR",
		...(meta?.cStat !== undefined && { cStat: meta.cStat }),
		...(meta?.codigoErro !== undefined && { codigoErro: meta.codigoErro }),
		...(meta?.consultaSituacao !== undefined && {
			consultaSituacao: meta.consultaSituacao,
		}),
	};
}
