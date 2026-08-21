import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import {
	executarToolPorNome,
	toolsParaGemini,
	toolsParaOpenAI,
} from "@/service/ia/tools/registrar-tools.js";
import type {
	AcaoExecutada,
	MensagemChat,
	RespostaAgente,
} from "@/service/ia/tools/tipos.js";
import { getApiBaseUrl } from "@/util/base-url.js";
import { httpBadGateway, httpBadRequest, httpOk } from "@/util/http-util.js";

interface ChatComAtenaParametros {
	idusuario: string;
	idempresa: string;
	mensagem: string;
	historico?: MensagemChat[];
}

const FETCH_TIMEOUT_MS = 60_000;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_ITEM_CHARS = 1_000;
const MAX_AGENT_ROUNDS = 6;

const SYSTEM_PROMPT = `Você é Atena, assistente operacional do ERP Mais Gestão.
Você ajuda com cadastros, pedidos (DAV), NF-e/NFC-e, relatórios e envio de documentos à contabilidade.

Regras:
- Responda sempre em português brasileiro, de forma clara e objetiva.
- Use as ferramentas disponíveis para executar ações reais. Não invente IDs, valores ou resultados.
- Colete dados em turnos quando faltar informação (ex.: PF ou PJ → CNPJ/CPF → confirmação).
- Em ações sensíveis (criar cliente, criar pedido, faturar NF-e/NFC-e, enviar docs à contabilidade), SEMPRE peça confirmação explícita do usuário e só então chame a ferramenta com confirmado=true.
- Para cliente PJ: consulte o CNPJ, resuma os dados e só crie após confirmação.
- Para relatórios: peça tipo e período (dataInicio/dataFim) se não forem informados.
- Para faturar pedido: confirme o iddav (ou código) com o usuário antes.
- Se uma ferramenta retornar erro ou bloqueio, explique ao usuário e oriente o próximo passo.
- Não exponha chaves de API nem detalhes internos técnicos.`;

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
}

function normalizarHistorico(
	historico?: MensagemChat[],
): MensagemChat[] | undefined {
	if (!historico || historico.length === 0) return undefined;

	const sliced = historico.slice(-MAX_HISTORY_ITEMS);
	return sliced.map((m) => ({
		role: m.role,
		content: (m.content || "").slice(0, MAX_HISTORY_ITEM_CHARS),
	}));
}

type OpenAIMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	tool_call_id?: string;
	name?: string;
};

async function loopOpenAI(params: {
	apiKey: string;
	mensagem: string;
	historico?: MensagemChat[];
	idusuario: string;
	idempresa: string;
}): Promise<RespostaAgente> {
	const messages: OpenAIMessage[] = [
		{ role: "system", content: SYSTEM_PROMPT },
	];

	if (params.historico) {
		for (const m of params.historico) {
			messages.push({ role: m.role, content: m.content });
		}
	}
	messages.push({ role: "user", content: params.mensagem });

	const tools = toolsParaOpenAI();
	const acoes: AcaoExecutada[] = [];
	const ctx = { idusuario: params.idusuario, idempresa: params.idempresa };

	for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
		const response = await fetchWithTimeout(
			"https://api.openai.com/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${params.apiKey}`,
				},
				body: JSON.stringify({
					model: "gpt-4o-mini",
					messages,
					tools,
					tool_choice: "auto",
					temperature: 0.3,
					max_tokens: 2000,
				}),
			},
			FETCH_TIMEOUT_MS,
		);

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ error: { message: "Erro desconhecido" } }));
			throw new Error(
				error.error?.message ||
					`Erro ao chamar OpenAI: ${response.statusText}`,
			);
		}

		const data = await response.json();
		const choice = data.choices?.[0]?.message;
		if (!choice) {
			return {
				resposta: "Desculpe, não consegui gerar uma resposta.",
				acoes,
			};
		}

		const toolCalls = choice.tool_calls as
			| Array<{
					id: string;
					type: "function";
					function: { name: string; arguments: string };
			  }>
			| undefined;

		if (toolCalls && toolCalls.length > 0) {
			messages.push({
				role: "assistant",
				content: choice.content ?? null,
				tool_calls: toolCalls,
			});

			for (const call of toolCalls) {
				let args: unknown = {};
				try {
					args = JSON.parse(call.function.arguments || "{}");
				} catch {
					args = {};
				}

				const { resultado, acao } = await executarToolPorNome(
					call.function.name,
					ctx,
					args,
				);
				acoes.push(acao);

				messages.push({
					role: "tool",
					tool_call_id: call.id,
					name: call.function.name,
					content: JSON.stringify({
						ok: resultado.ok,
						resumo: resultado.resumo,
						dados: resultado.dados ?? null,
					}),
				});
			}
			continue;
		}

		return {
			resposta:
				typeof choice.content === "string" && choice.content.trim()
					? choice.content
					: "Pronto. Posso ajudar com mais alguma coisa?",
			acoes,
		};
	}

	return {
		resposta:
			"Atingi o limite de etapas desta solicitação. Resuma o que deseja e tente novamente.",
		acoes,
	};
}

type GeminiPart =
	| { text: string }
	| { functionCall: { name: string; args?: Record<string, unknown> } }
	| {
			functionResponse: {
				name: string;
				response: Record<string, unknown>;
			};
	  };

type GeminiContent = {
	role: "user" | "model";
	parts: GeminiPart[];
};

async function loopGemini(params: {
	apiKey: string;
	mensagem: string;
	historico?: MensagemChat[];
	idusuario: string;
	idempresa: string;
}): Promise<RespostaAgente> {
	const contents: GeminiContent[] = [];

	if (params.historico) {
		for (const m of params.historico) {
			contents.push({
				role: m.role === "user" ? "user" : "model",
				parts: [{ text: m.content }],
			});
		}
	}
	contents.push({
		role: "user",
		parts: [{ text: params.mensagem }],
	});

	const acoes: AcaoExecutada[] = [];
	const ctx = { idusuario: params.idusuario, idempresa: params.idempresa };
	const tools = toolsParaGemini();

	const modelos = ["gemini-2.0-flash", "gemini-1.5-flash"];

	for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
		let data: {
			candidates?: Array<{
				content?: { parts?: GeminiPart[]; role?: string };
			}>;
			error?: { message?: string };
		} | null = null;
		let lastError: Error | null = null;

		for (const modelo of modelos) {
			try {
				const response = await fetchWithTimeout(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${params.apiKey}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
							contents,
							tools,
							generationConfig: {
								temperature: 0.3,
								maxOutputTokens: 2000,
							},
						}),
					},
					FETCH_TIMEOUT_MS,
				);

				if (!response.ok) {
					const error = await response
						.json()
						.catch(() => ({ error: { message: "Erro desconhecido" } }));
					lastError = new Error(
						error.error?.message ||
							`Erro ao chamar Gemini (${modelo}): ${response.statusText}`,
					);
					continue;
				}

				data = await response.json();
				lastError = null;
				break;
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error("Falha no Gemini");
			}
		}

		if (!data) {
			throw lastError ?? new Error("Falha ao chamar Gemini");
		}

		const parts = data.candidates?.[0]?.content?.parts ?? [];
		const functionCalls = parts.filter(
			(p): p is { functionCall: { name: string; args?: Record<string, unknown> } } =>
				"functionCall" in p && Boolean(p.functionCall?.name),
		);

		if (functionCalls.length > 0) {
			contents.push({
				role: "model",
				parts,
			});

			const responseParts: GeminiPart[] = [];
			for (const part of functionCalls) {
				const { resultado, acao } = await executarToolPorNome(
					part.functionCall.name,
					ctx,
					part.functionCall.args ?? {},
				);
				acoes.push(acao);
				responseParts.push({
					functionResponse: {
						name: part.functionCall.name,
						response: {
							ok: resultado.ok,
							resumo: resultado.resumo,
							dados: resultado.dados ?? null,
						},
					},
				});
			}

			contents.push({
				role: "user",
				parts: responseParts,
			});
			continue;
		}

		const texto = parts
			.filter((p): p is { text: string } => "text" in p && typeof p.text === "string")
			.map((p) => p.text)
			.join("\n")
			.trim();

		return {
			resposta: texto || "Pronto. Posso ajudar com mais alguma coisa?",
			acoes,
		};
	}

	return {
		resposta:
			"Atingi o limite de etapas desta solicitação. Resuma o que deseja e tente novamente.",
		acoes,
	};
}

async function chatOpenRouterSemTools(params: {
	apiKey: string;
	mensagem: string;
	historico?: MensagemChat[];
}): Promise<string> {
	const messages: Array<{ role: string; content: string }> = [
		{ role: "system", content: SYSTEM_PROMPT },
	];
	if (params.historico) {
		messages.push(...params.historico);
	}
	messages.push({ role: "user", content: params.mensagem });

	const response = await fetchWithTimeout(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.apiKey}`,
				"HTTP-Referer": getApiBaseUrl(),
				"X-Title": "Mais Gestão - Atena",
			},
			body: JSON.stringify({
				model: "openai/gpt-4o-mini",
				messages,
				temperature: 0.3,
				max_tokens: 1500,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: { message: "Erro desconhecido" } }));
		throw new Error(
			error.error?.message ||
				`Erro ao chamar OpenRouter: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return (
		data.choices?.[0]?.message?.content ||
		"Desculpe, não consegui gerar uma resposta."
	);
}

export async function chatComAtenaService({
	idusuario,
	idempresa,
	mensagem,
	historico,
}: ChatComAtenaParametros): Promise<HttpResponse<RespostaAgente>> {
	if (!mensagem || mensagem.trim() === "") {
		return httpBadRequest({ error: "Mensagem é obrigatória" });
	}

	if (mensagem.length > MAX_MESSAGE_CHARS) {
		return httpBadRequest({
			error: `Mensagem excede o limite de ${MAX_MESSAGE_CHARS} caracteres`,
		});
	}

	const historicoNormalizado = normalizarHistorico(historico);

	const configuracaoResult = await buscarConfiguracaoUsuarioService({
		idusuario,
		idempresa,
	});

	if (!configuracaoResult.success || !configuracaoResult.body) {
		return httpBadRequest({
			error:
				"Nenhuma API de IA configurada. Configure OpenAI ou Gemini em Configurações > Integrações.",
		});
	}

	const integracoes = configuracaoResult.body.integracoes;

	let apiKey: string | undefined;
	let apiTipo: "openai" | "gemini" | "openrouter" | null = null;

	if (integracoes.openaiApiKey && integracoes.openaiApiKey.trim() !== "") {
		apiKey = integracoes.openaiApiKey;
		apiTipo = "openai";
	} else if (
		integracoes.geminiApiKey &&
		integracoes.geminiApiKey.trim() !== ""
	) {
		apiKey = integracoes.geminiApiKey;
		apiTipo = "gemini";
	} else if (
		integracoes.openrouterApiKey &&
		integracoes.openrouterApiKey.trim() !== ""
	) {
		apiKey = integracoes.openrouterApiKey;
		apiTipo = "openrouter";
	}

	if (!apiKey || !apiTipo) {
		return httpBadRequest({
			error:
				"Nenhuma API de IA configurada. Configure OpenAI ou Gemini em Configurações > Integrações.",
		});
	}

	try {
		if (apiTipo === "openai") {
			const resultado = await loopOpenAI({
				apiKey,
				mensagem,
				historico: historicoNormalizado,
				idusuario,
				idempresa,
			});
			return httpOk(resultado);
		}

		if (apiTipo === "gemini") {
			const resultado = await loopGemini({
				apiKey,
				mensagem,
				historico: historicoNormalizado,
				idusuario,
				idempresa,
			});
			return httpOk(resultado);
		}

		const resposta = await chatOpenRouterSemTools({
			apiKey,
			mensagem,
			historico: historicoNormalizado,
		});
		return httpOk({
			resposta: `${resposta}\n\n(Observação: com OpenRouter as automações/ferramentas ficam limitadas. Configure OpenAI ou Gemini para executar tarefas.)`,
			acoes: [],
		});
	} catch (error) {
		console.error("Erro ao chamar API de IA:", error);
		return httpBadGateway("Serviço de IA indisponível");
	}
}
