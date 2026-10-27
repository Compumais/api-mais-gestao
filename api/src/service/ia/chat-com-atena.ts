import type { HttpResponse } from "@/model/http-model.js";
import type { IntegracoesUsuario } from "@/repositories/configuracao-usuario-repositories.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import {
	fetchWithTimeout,
	MODELOS_GEMINI,
	OLLAMA_TIMEOUT_MS,
	mensagemErroIaAmigavel,
	type ProvedorIa,
	resolverProvedor,
} from "@/service/ia/provedores.js";
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

class ToolsNaoSuportadasError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ToolsNaoSuportadasError";
	}
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
	modelo: string;
	mensagem: string;
	historico?: MensagemChat[];
	idusuario: string;
	idempresa: string;
	chatCompletionsUrl?: string;
	timeoutMs?: number;
	omitirTools?: boolean;
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

	const rotulo = params.chatCompletionsUrl ? "Ollama" : "OpenAI";

	for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (params.apiKey) {
			headers.Authorization = `Bearer ${params.apiKey}`;
		}

		const payload: Record<string, unknown> = {
			model: params.modelo,
			messages,
			temperature: 0.3,
			max_tokens: 2000,
		};
		if (!params.omitirTools) {
			payload.tools = tools;
			payload.tool_choice = "auto";
		}

		const response = await fetchWithTimeout(
			params.chatCompletionsUrl ??
				"https://api.openai.com/v1/chat/completions",
			{
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			},
			params.timeoutMs ?? FETCH_TIMEOUT_MS,
		);

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ error: { message: "Erro desconhecido" } }));
			const message =
				error.error?.message ||
				`Erro ao chamar ${rotulo}: ${response.statusText}`;
			if (
				!params.omitirTools &&
				params.chatCompletionsUrl &&
				/tool/i.test(message)
			) {
				throw new ToolsNaoSuportadasError(message);
			}
			throw new Error(message);
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
	modelo: string;
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

	const modelos = [
		params.modelo,
		...MODELOS_GEMINI.filter((m) => m !== params.modelo),
	];

	for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
		let data: {
			candidates?: Array<{
				content?: { parts?: GeminiPart[]; role?: string };
			}>;
			error?: { message?: string };
		} | null = null;
		let lastError: Error | null = null;
		let modeloUsado = params.modelo;

		for (const modelo of modelos) {
			try {
				const response = await fetchWithTimeout(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
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
					const msg =
						error.error?.message ||
						`Erro ao chamar Gemini (${modelo}): ${response.statusText}`;
					lastError = new Error(msg);
					if (
						/not found|NOT_FOUND|unsupported|is not found/i.test(msg) ||
						response.status === 404
					) {
						continue;
					}
					throw lastError;
				}

				data = await response.json();
				modeloUsado = modelo;
				lastError = null;
				break;
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error("Falha no Gemini");
				if (
					!/not found|NOT_FOUND|unsupported|is not found/i.test(
						lastError.message,
					)
				) {
					throw lastError;
				}
			}
		}

		if (!data) {
			throw lastError ?? new Error(`Falha ao chamar Gemini (${modeloUsado})`);
		}

		const parts = data.candidates?.[0]?.content?.parts ?? [];
		const functionCalls = parts.filter(
			(
				p,
			): p is {
				functionCall: { name: string; args?: Record<string, unknown> };
			} => "functionCall" in p && Boolean(p.functionCall?.name),
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
			.filter(
				(p): p is { text: string } =>
					"text" in p && typeof p.text === "string",
			)
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

async function chatCompatSemTools(params: {
	url: string;
	apiKey?: string;
	modelo: string;
	mensagem: string;
	historico?: MensagemChat[];
	timeoutMs?: number;
	headersExtras?: Record<string, string>;
	rotulo: string;
}): Promise<string> {
	const messages: Array<{ role: string; content: string }> = [
		{ role: "system", content: SYSTEM_PROMPT },
	];
	if (params.historico) {
		messages.push(...params.historico);
	}
	messages.push({ role: "user", content: params.mensagem });

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...params.headersExtras,
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
				messages,
				temperature: 0.3,
				max_tokens: 1500,
			}),
		},
		params.timeoutMs ?? FETCH_TIMEOUT_MS,
	);

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: { message: "Erro desconhecido" } }));
		throw new Error(
			error.error?.message ||
				`Erro ao chamar ${params.rotulo}: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return (
		data.choices?.[0]?.message?.content ||
		"Desculpe, não consegui gerar uma resposta."
	);
}

function chaveDoProvedor(
	integracoes: IntegracoesUsuario,
	provedor: ProvedorIa,
): string | undefined {
	if (provedor === "openai") return integracoes.openaiApiKey?.trim() || undefined;
	if (provedor === "gemini") return integracoes.geminiApiKey?.trim() || undefined;
	if (provedor === "openrouter") {
		return integracoes.openrouterApiKey?.trim() || undefined;
	}
	return undefined;
}

async function responderOllama(params: {
	chatCompletionsUrl: string;
	modelo: string;
	mensagem: string;
	historico?: MensagemChat[];
	idusuario: string;
	idempresa: string;
}): Promise<RespostaAgente> {
	try {
		return await loopOpenAI({
			apiKey: "",
			modelo: params.modelo,
			mensagem: params.mensagem,
			historico: params.historico,
			idusuario: params.idusuario,
			idempresa: params.idempresa,
			chatCompletionsUrl: params.chatCompletionsUrl,
			timeoutMs: OLLAMA_TIMEOUT_MS,
		});
	} catch (error) {
		if (!(error instanceof ToolsNaoSuportadasError)) {
			throw error;
		}
		const resposta = await chatCompatSemTools({
			url: params.chatCompletionsUrl,
			modelo: params.modelo,
			mensagem: params.mensagem,
			historico: params.historico,
			timeoutMs: OLLAMA_TIMEOUT_MS,
			rotulo: "Ollama",
		});
		return {
			resposta: `${resposta}\n\n(Observação: este modelo não executa automações. A resposta é só orientativa.)`,
			acoes: [],
		};
	}
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

	const integracoes =
		configuracaoResult.success && configuracaoResult.body
			? configuracaoResult.body.integracoes
			: {};
	const resolvido = resolverProvedor(integracoes);

	if (!resolvido) {
		return httpBadRequest({
			error:
				"Nenhuma API de IA configurada. Configure OpenAI ou Gemini em Configurações > Integrações e use o botão Testar.",
		});
	}

	const { provedor, apiKey, modelo } = resolvido;

	try {
		if (provedor === "ollama" && resolvido.chatCompletionsUrl) {
			const resultado = await responderOllama({
				chatCompletionsUrl: resolvido.chatCompletionsUrl,
				modelo,
				mensagem,
				historico: historicoNormalizado,
				idusuario,
				idempresa,
			});
			return httpOk(resultado);
		}

		if (provedor === "openai") {
			const resultado = await loopOpenAI({
				apiKey,
				modelo,
				mensagem,
				historico: historicoNormalizado,
				idusuario,
				idempresa,
			});
			return httpOk(resultado);
		}

		if (provedor === "gemini") {
			const resultado = await loopGemini({
				apiKey,
				modelo,
				mensagem,
				historico: historicoNormalizado,
				idusuario,
				idempresa,
			});
			return httpOk(resultado);
		}

		const resposta = await chatCompatSemTools({
			url: "https://openrouter.ai/api/v1/chat/completions",
			apiKey,
			modelo,
			mensagem,
			historico: historicoNormalizado,
			rotulo: "OpenRouter",
			headersExtras: {
				"HTTP-Referer": getApiBaseUrl(),
				"X-Title": "Mais Gestão - Atena",
			},
		});
		return httpOk({
			resposta: `${resposta}\n\n(Observação: com OpenRouter as automações/ferramentas ficam limitadas. Preferência: OpenAI ou Gemini.)`,
			acoes: [],
		});
	} catch (error) {
		console.error("Erro ao chamar API de IA:", error);
		const msg = mensagemErroIaAmigavel(error);

		// Fallback auto: se preferência auto e falhou o provedor atual, tenta o outro
		const preferido = integracoes.provedorPreferido ?? "auto";
		if (preferido === "auto") {
			const alternativos = (
				["gemini", "openai", "openrouter"] as const
			).filter((p) => p !== provedor);

			for (const alt of alternativos) {
				const altKey = chaveDoProvedor(integracoes, alt);
				if (!altKey) continue;
				const altResolvido = resolverProvedor({
					...integracoes,
					provedorPreferido: alt,
				});
				if (!altResolvido) continue;
				try {
					if (alt === "gemini") {
						return httpOk(
							await loopGemini({
								apiKey: altResolvido.apiKey,
								modelo: altResolvido.modelo,
								mensagem,
								historico: historicoNormalizado,
								idusuario,
								idempresa,
							}),
						);
					}
					if (alt === "openai") {
						return httpOk(
							await loopOpenAI({
								apiKey: altResolvido.apiKey,
								modelo: altResolvido.modelo,
								mensagem,
								historico: historicoNormalizado,
								idusuario,
								idempresa,
							}),
						);
					}
				} catch (altError) {
					console.error(`Fallback ${alt} também falhou:`, altError);
				}
			}
		}

		if (/autenticação|API key|invalid|401|403/i.test(msg)) {
			return httpBadRequest({ error: msg });
		}
		return httpBadGateway(msg);
	}
}
