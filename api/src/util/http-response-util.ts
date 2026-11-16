import type { HttpResponse } from "@/model/http-model.js";

export function mensagemErroHttp(
	resposta: HttpResponse<unknown>,
	fallback: string,
): string {
	if (resposta.success) return fallback;
	return typeof resposta.error === "string" ? resposta.error : fallback;
}
