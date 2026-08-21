import type { IntegracoesUsuario } from "@/repositories/configuracao-usuario-repositories.js";

export type ProvedorIa = "openai" | "gemini" | "openrouter";
export type ProvedorPreferido = "auto" | ProvedorIa;

export const MODELOS_OPENAI = [
	"gpt-4o-mini",
	"gpt-4o",
	"gpt-4.1-mini",
	"gpt-4.1",
] as const;

export const MODELOS_GEMINI = [
	"gemini-2.5-flash",
	"gemini-2.0-flash",
	"gemini-2.5-flash-lite",
	"gemini-flash-latest",
	"gemini-1.5-flash",
] as const;

export const MODELOS_OPENROUTER = [
	"openai/gpt-4o-mini",
	"google/gemini-2.0-flash-001",
	"google/gemini-flash-1.5",
] as const;

const FETCH_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
}

function chaveValida(valor: string | null | undefined): string | undefined {
	const t = valor?.trim();
	return t ? t : undefined;
}

export function resolverProvedor(
	integracoes: IntegracoesUsuario,
): { provedor: ProvedorIa; apiKey: string; modelo: string } | null {
	const preferido = (integracoes.provedorPreferido ?? "auto") as ProvedorPreferido;
	const openai = chaveValida(integracoes.openaiApiKey);
	const gemini = chaveValida(integracoes.geminiApiKey);
	const openrouter = chaveValida(integracoes.openrouterApiKey);

	const modeloOpenai = chaveValida(integracoes.modeloOpenai) ?? MODELOS_OPENAI[0];
	const modeloGemini = chaveValida(integracoes.modeloGemini) ?? MODELOS_GEMINI[0];
	const modeloOpenrouter =
		chaveValida(integracoes.modeloOpenrouter) ?? MODELOS_OPENROUTER[0];

	if (preferido === "openai" && openai) {
		return { provedor: "openai", apiKey: openai, modelo: modeloOpenai };
	}
	if (preferido === "gemini" && gemini) {
		return { provedor: "gemini", apiKey: gemini, modelo: modeloGemini };
	}
	if (preferido === "openrouter" && openrouter) {
		return {
			provedor: "openrouter",
			apiKey: openrouter,
			modelo: modeloOpenrouter,
		};
	}

	// auto: Gemini primeiro (gratuito/comum), depois OpenAI, depois OpenRouter
	if (gemini) {
		return { provedor: "gemini", apiKey: gemini, modelo: modeloGemini };
	}
	if (openai) {
		return { provedor: "openai", apiKey: openai, modelo: modeloOpenai };
	}
	if (openrouter) {
		return {
			provedor: "openrouter",
			apiKey: openrouter,
			modelo: modeloOpenrouter,
		};
	}
	return null;
}

/** Remove campos que costumam quebrar functionDeclarations do Gemini. */
export function sanitizarSchemaGemini(
	schema: Record<string, unknown>,
): Record<string, unknown> {
	const clone = structuredClone(schema) as Record<string, unknown>;

	const limpar = (node: unknown): void => {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) limpar(item);
			return;
		}
		const obj = node as Record<string, unknown>;
		delete obj.$schema;
		delete obj.additionalProperties;
		delete obj.$ref;
		delete obj.definitions;
		delete obj.$defs;

		if (obj.type === "object" && obj.properties == null) {
			obj.properties = {};
		}

		for (const valor of Object.values(obj)) {
			limpar(valor);
		}
	};

	limpar(clone);
	return clone;
}

export type ResultadoTesteIa = {
	ok: boolean;
	provedor: ProvedorIa;
	modelo: string;
	mensagem: string;
	respostaModelo?: string;
};

export async function testarConexaoIa(params: {
	provedor: ProvedorIa;
	apiKey: string;
	modelo?: string;
}): Promise<ResultadoTesteIa> {
	const apiKey = params.apiKey.trim();
	if (!apiKey) {
		return {
			ok: false,
			provedor: params.provedor,
			modelo: params.modelo ?? "",
			mensagem: "Informe a chave da API para testar.",
		};
	}

	try {
		if (params.provedor === "openai") {
			const modelo = params.modelo?.trim() || MODELOS_OPENAI[0];
			const response = await fetchWithTimeout(
				"https://api.openai.com/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						model: modelo,
						messages: [
							{ role: "user", content: 'Responda apenas com a palavra "ok".' },
						],
						max_tokens: 16,
						temperature: 0,
					}),
				},
			);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					provedor: "openai",
					modelo,
					mensagem:
						data?.error?.message ||
						`OpenAI rejeitou a chave/modelo (HTTP ${response.status}).`,
				};
			}
			const texto = data?.choices?.[0]?.message?.content?.trim() ?? "";
			return {
				ok: true,
				provedor: "openai",
				modelo,
				mensagem: "Conexão OpenAI OK.",
				respostaModelo: texto,
			};
		}

		if (params.provedor === "gemini") {
			const candidatos = [
				params.modelo?.trim(),
				...MODELOS_GEMINI,
			].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

			let ultimoErro = "Falha ao chamar Gemini.";
			for (const modelo of candidatos) {
				const response = await fetchWithTimeout(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							contents: [
								{
									role: "user",
									parts: [{ text: 'Responda apenas com a palavra "ok".' }],
								},
							],
						}),
					},
				);
				const data = await response.json().catch(() => ({}));
				if (!response.ok) {
					ultimoErro =
						data?.error?.message ||
						`Gemini rejeitou (HTTP ${response.status}) no modelo ${modelo}.`;
					// tenta próximo modelo se for not found
					if (
						/not found|is not found|NOT_FOUND|unsupported/i.test(ultimoErro) ||
						response.status === 404
					) {
						continue;
					}
					return {
						ok: false,
						provedor: "gemini",
						modelo,
						mensagem: ultimoErro,
					};
				}
				const texto =
					data?.candidates?.[0]?.content?.parts
						?.map((p: { text?: string }) => p.text ?? "")
						.join("")
						.trim() ?? "";
				return {
					ok: true,
					provedor: "gemini",
					modelo,
					mensagem: `Conexão Gemini OK (modelo ${modelo}).`,
					respostaModelo: texto,
				};
			}
			return {
				ok: false,
				provedor: "gemini",
				modelo: candidatos[0] ?? "",
				mensagem: ultimoErro,
			};
		}

		const modelo = params.modelo?.trim() || MODELOS_OPENROUTER[0];
		const response = await fetchWithTimeout(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: modelo,
					messages: [
						{ role: "user", content: 'Responda apenas com a palavra "ok".' },
					],
					max_tokens: 16,
				}),
			},
		);
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			return {
				ok: false,
				provedor: "openrouter",
				modelo,
				mensagem:
					data?.error?.message ||
					`OpenRouter rejeitou a chave/modelo (HTTP ${response.status}).`,
			};
		}
		const texto = data?.choices?.[0]?.message?.content?.trim() ?? "";
		return {
			ok: true,
			provedor: "openrouter",
			modelo,
			mensagem: "Conexão OpenRouter OK.",
			respostaModelo: texto,
		};
	} catch (error) {
		return {
			ok: false,
			provedor: params.provedor,
			modelo: params.modelo ?? "",
			mensagem:
				error instanceof Error
					? error.name === "AbortError"
						? "Timeout ao testar a API de IA."
						: error.message
					: "Falha inesperada ao testar a API de IA.",
		};
	}
}

export function mensagemErroIaAmigavel(error: unknown): string {
	const raw =
		error instanceof Error ? error.message : "Serviço de IA indisponível";
	if (/API[_ ]?key|invalid|unauthorized|403|401|permission/i.test(raw)) {
		return `Falha de autenticação na API de IA: ${raw}. Verifique a chave em Configurações > Integrações (botão Testar).`;
	}
	return raw;
}
