import type { IntegracoesUsuario } from "@/repositories/configuracao-usuario-repositories.js";
import {
	fetchWithTimeout,
	MODELOS_GEMINI,
	mensagemErroIaAmigavel,
	type ProvedorIa,
	resolverProvedor,
} from "@/service/ia/provedores.js";

const FETCH_TIMEOUT_MS = 45_000;

type OpenAiChatResponse = {
	error?: { message?: string };
	choices?: Array<{ message?: { content?: string } }>;
};

type GeminiGenerateResponse = {
	error?: { message?: string };
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
	}>;
};

export type ResultadoCompletarTextoIa =
	| {
			ok: true;
			texto: string;
			provedor: ProvedorIa;
			modelo: string;
	  }
	| {
			ok: false;
			erro: string;
	  };

export async function completarTextoIa(params: {
	integracoes: IntegracoesUsuario;
	systemPrompt: string;
	mensagem: string;
	maxTokens?: number;
}): Promise<ResultadoCompletarTextoIa> {
	const resolvido = resolverProvedor(params.integracoes);
	if (!resolvido) {
		return {
			ok: false,
			erro: "Nenhuma chave de API de IA configurada.",
		};
	}

	const maxTokens = params.maxTokens ?? 1200;

	try {
		if (resolvido.provedor === "openai") {
			return await completarOpenAi({
				apiKey: resolvido.apiKey,
				modelo: resolvido.modelo,
				systemPrompt: params.systemPrompt,
				mensagem: params.mensagem,
				maxTokens,
			});
		}

		if (resolvido.provedor === "gemini") {
			return await completarGemini({
				apiKey: resolvido.apiKey,
				modelo: resolvido.modelo,
				systemPrompt: params.systemPrompt,
				mensagem: params.mensagem,
			});
		}

		return await completarOpenRouter({
			apiKey: resolvido.apiKey,
			modelo: resolvido.modelo,
			systemPrompt: params.systemPrompt,
			mensagem: params.mensagem,
			maxTokens,
		});
	} catch (error) {
		return {
			ok: false,
			erro: mensagemErroIaAmigavel(error),
		};
	}
}

async function completarOpenAi(params: {
	apiKey: string;
	modelo: string;
	systemPrompt: string;
	mensagem: string;
	maxTokens: number;
}): Promise<ResultadoCompletarTextoIa> {
	const response = await fetchWithTimeout(
		"https://api.openai.com/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.apiKey}`,
			},
			body: JSON.stringify({
				model: params.modelo,
				messages: [
					{ role: "system", content: params.systemPrompt },
					{ role: "user", content: params.mensagem },
				],
				max_tokens: params.maxTokens,
				temperature: 0.2,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	const data = (await response.json().catch(() => ({}))) as OpenAiChatResponse;
	if (!response.ok) {
		return {
			ok: false,
			erro:
				data.error?.message ??
				`OpenAI rejeitou a requisição (HTTP ${response.status}).`,
		};
	}

	const texto = data.choices?.[0]?.message?.content?.trim() ?? "";
	if (!texto) {
		return { ok: false, erro: "A IA não retornou conteúdo." };
	}

	return {
		ok: true,
		texto,
		provedor: "openai",
		modelo: params.modelo,
	};
}

async function completarGemini(params: {
	apiKey: string;
	modelo: string;
	systemPrompt: string;
	mensagem: string;
}): Promise<ResultadoCompletarTextoIa> {
	const modelos = [
		params.modelo,
		...MODELOS_GEMINI.filter((modelo) => modelo !== params.modelo),
	];

	let ultimoErro = "Falha ao chamar Gemini.";

	for (const modelo of modelos) {
		const response = await fetchWithTimeout(
			`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					systemInstruction: { parts: [{ text: params.systemPrompt }] },
					contents: [
						{
							role: "user",
							parts: [{ text: params.mensagem }],
						},
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 2000,
					},
				}),
			},
			FETCH_TIMEOUT_MS,
		);

		const data = (await response
			.json()
			.catch(() => ({}))) as GeminiGenerateResponse;

		if (!response.ok) {
			ultimoErro =
				data.error?.message ??
				`Gemini rejeitou (HTTP ${response.status}) no modelo ${modelo}.`;
			if (
				/not found|is not found|NOT_FOUND|unsupported/i.test(ultimoErro) ||
				response.status === 404
			) {
				continue;
			}
			return { ok: false, erro: ultimoErro };
		}

		const texto =
			data.candidates?.[0]?.content?.parts
				?.map((parte) => parte.text ?? "")
				.join("")
				.trim() ?? "";

		if (!texto) {
			return { ok: false, erro: "A IA não retornou conteúdo." };
		}

		return {
			ok: true,
			texto,
			provedor: "gemini",
			modelo,
		};
	}

	return { ok: false, erro: ultimoErro };
}

async function completarOpenRouter(params: {
	apiKey: string;
	modelo: string;
	systemPrompt: string;
	mensagem: string;
	maxTokens: number;
}): Promise<ResultadoCompletarTextoIa> {
	const response = await fetchWithTimeout(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.apiKey}`,
			},
			body: JSON.stringify({
				model: params.modelo,
				messages: [
					{ role: "system", content: params.systemPrompt },
					{ role: "user", content: params.mensagem },
				],
				max_tokens: params.maxTokens,
				temperature: 0.2,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	const data = (await response.json().catch(() => ({}))) as OpenAiChatResponse;
	if (!response.ok) {
		return {
			ok: false,
			erro:
				data.error?.message ??
				`OpenRouter rejeitou a requisição (HTTP ${response.status}).`,
		};
	}

	const texto = data.choices?.[0]?.message?.content?.trim() ?? "";
	if (!texto) {
		return { ok: false, erro: "A IA não retornou conteúdo." };
	}

	return {
		ok: true,
		texto,
		provedor: "openrouter",
		modelo: params.modelo,
	};
}
