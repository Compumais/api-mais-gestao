import type { IntegracoesUsuario } from "@/repositories/configuracao-usuario-repositories.js";
import {
	fetchWithTimeout,
	MODELOS_GEMINI,
	OLLAMA_TIMEOUT_MS,
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
			return await completarChatCompletions({
				url: "https://api.openai.com/v1/chat/completions",
				apiKey: resolvido.apiKey,
				modelo: resolvido.modelo,
				systemPrompt: params.systemPrompt,
				mensagem: params.mensagem,
				maxTokens,
				timeoutMs: FETCH_TIMEOUT_MS,
				provedor: "openai",
				rotulo: "OpenAI",
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

		if (resolvido.provedor === "ollama" && resolvido.chatCompletionsUrl) {
			return await completarChatCompletions({
				url: resolvido.chatCompletionsUrl,
				modelo: resolvido.modelo,
				systemPrompt: params.systemPrompt,
				mensagem: params.mensagem,
				maxTokens,
				timeoutMs: OLLAMA_TIMEOUT_MS,
				provedor: "ollama",
				rotulo: "Ollama",
			});
		}

		return await completarChatCompletions({
			url: "https://openrouter.ai/api/v1/chat/completions",
			apiKey: resolvido.apiKey,
			modelo: resolvido.modelo,
			systemPrompt: params.systemPrompt,
			mensagem: params.mensagem,
			maxTokens,
			timeoutMs: FETCH_TIMEOUT_MS,
			provedor: "openrouter",
			rotulo: "OpenRouter",
		});
	} catch (error) {
		return {
			ok: false,
			erro: mensagemErroIaAmigavel(error),
		};
	}
}

async function completarChatCompletions(params: {
	url: string;
	apiKey?: string;
	modelo: string;
	systemPrompt: string;
	mensagem: string;
	maxTokens: number;
	timeoutMs: number;
	provedor: ProvedorIa;
	rotulo: string;
}): Promise<ResultadoCompletarTextoIa> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (params.apiKey) {
		headers.Authorization = `Bearer ${params.apiKey}`;
	}

	const response = await fetchWithTimeout(
		params.url,
		{
			method: "POST",
			headers,
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
		params.timeoutMs,
	);

	const data = (await response.json().catch(() => ({}))) as OpenAiChatResponse;
	if (!response.ok) {
		return {
			ok: false,
			erro:
				data.error?.message ??
				`${params.rotulo} rejeitou a requisição (HTTP ${response.status}).`,
		};
	}

	const texto = data.choices?.[0]?.message?.content?.trim() ?? "";
	if (!texto) {
		return { ok: false, erro: "A IA não retornou conteúdo." };
	}

	return {
		ok: true,
		texto,
		provedor: params.provedor,
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

