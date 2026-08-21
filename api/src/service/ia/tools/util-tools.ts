import type { HttpResponse } from "@/model/http-model.js";
import type { ResultadoTool } from "./tipos.js";

export function exigirConfirmacao(
	args: Record<string, unknown>,
): ResultadoTool | null {
	if (args.confirmado !== true) {
		return {
			ok: false,
			resumo:
				"Confirmação necessária. Pergunte ao usuário e só execute novamente com confirmado=true após o aceite explícito.",
		};
	}
	return null;
}

export function httpParaResultadoTool(
	resultado: HttpResponse<unknown>,
	resumoSucesso: (body: unknown) => string,
): ResultadoTool {
	if (!resultado.success) {
		return {
			ok: false,
			resumo: resultado.error || `Falha (${resultado.status})`,
			dados: { code: resultado.code },
		};
	}

	return {
		ok: true,
		resumo: resumoSucesso(resultado.body),
		dados: resultado.body ?? null,
	};
}

export function truncarConteudo(texto: string, max = 4_000): string {
	if (texto.length <= max) return texto;
	return `${texto.slice(0, max)}\n...(conteúdo truncado)`;
}

export function zodParaJsonSchema(schema: {
	toJSONSchema?: () => Record<string, unknown>;
}): Record<string, unknown> {
	if (typeof schema.toJSONSchema === "function") {
		const json = schema.toJSONSchema();
		const { $schema: _s, ...rest } = json;
		return rest;
	}
	return { type: "object", properties: {}, additionalProperties: true };
}
