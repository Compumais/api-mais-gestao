import type { HttpResponse } from "../model/http-model";

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
		error: "Não autorizado",
		code: "UNAUTHORIZED_ERROR",
	};
}

export function httpNaoEncontrado() {
	return {
		success: false,
		status: 404,
		error: "Recurso não encontrado",
		code: "NOT_FOUND_ERROR",
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

export function httpRecursoExistente() {
	return {
		success: false,
		status: 409,
		error: "Recurso já existe",
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
		error: "Erro ao processar a requisição",
		code: "BAD_REQUEST_ERROR",
	};
}
