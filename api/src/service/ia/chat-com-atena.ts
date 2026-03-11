import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import {
	buscarDadosDashboardService,
	buscarHistoricoFinanceiroService,
} from "@/service/dashboard/buscar-dados-dashboard.js";
import { buscarUltimasMovimentacoesService } from "@/service/dashboard/buscar-ultimas-movimentacoes.js";
import { httpBadGateway, httpBadRequest, httpOk } from "@/util/http-util.js";

interface ChatComAtenaParametros {
	idusuario: string;
	idempresa: string;
	mensagem: string;
	historico?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface RespostaIA {
	resposta: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_ITEM_CHARS = 1_000;
const MAX_CONTEXT_CHARS = 10_000;

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
	historico?: Array<{ role: "user" | "assistant"; content: string }>,
) {
	if (!historico || historico.length === 0) return undefined;

	const sliced = historico.slice(-MAX_HISTORY_ITEMS);
	return sliced.map((m) => ({
		role: m.role,
		content: (m.content || "").slice(0, MAX_HISTORY_ITEM_CHARS),
	}));
}

function truncarContexto(contexto: string) {
	if (contexto.length <= MAX_CONTEXT_CHARS) return contexto;
	return `${contexto.slice(0, MAX_CONTEXT_CHARS)}\n...(contexto truncado)`;
}

async function chamarOpenAI(
	apiKey: string,
	mensagem: string,
	contexto: string,
	historico?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
	const systemPrompt = `Você é Atena, uma assistente especializada em análise de dados financeiros. Seu papel é ajudar usuários a entenderem melhor os dados do dashboard financeiro da empresa. Seja clara, objetiva e use os dados fornecidos para dar respostas precisas.

Contexto do Dashboard:
${contexto}

Responda sempre em português brasileiro de forma profissional e amigável.`;

	const messages: Array<{
		role: "user" | "assistant" | "system";
		content: string;
	}> = [{ role: "system", content: systemPrompt }];

	if (historico) {
		messages.push(...historico);
	}

	messages.push({ role: "user", content: mensagem });

	const response = await fetchWithTimeout(
		"https://api.openai.com/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages,
				temperature: 0.7,
				max_tokens: 1000,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(
			error.error?.message || `Erro ao chamar OpenAI: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return data.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
}

async function chamarGemini(
	apiKey: string,
	mensagem: string,
	contexto: string,
	historico?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
	const systemPrompt = `Você é Atena, uma assistente especializada em análise de dados financeiros. Seu papel é ajudar usuários a entenderem melhor os dados do dashboard financeiro da empresa. Seja clara, objetiva e use os dados fornecidos para dar respostas precisas.

Contexto do Dashboard:
${contexto}

Responda sempre em português brasileiro de forma profissional e amigável.`;

	const conversationHistory: Array<{
		role: "user" | "model";
		parts: Array<{ text: string }>;
	}> = [];

	if (historico) {
		for (const msg of historico) {
			conversationHistory.push({
				role: msg.role === "user" ? "user" : "model",
				parts: [{ text: msg.content }],
			});
		}
	}

	conversationHistory.push({
		role: "user",
		parts: [{ text: `${systemPrompt}\n\nPergunta do usuário: ${mensagem}` }],
	});

	const response = await fetchWithTimeout(
		`https://generativeai.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contents: conversationHistory,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(
			error.error?.message || `Erro ao chamar Gemini: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return (
		data.candidates?.[0]?.content?.parts?.[0]?.text ||
		"Desculpe, não consegui gerar uma resposta."
	);
}

async function chamarOpenRouter(
	apiKey: string,
	mensagem: string,
	contexto: string,
	historico?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
	const systemPrompt = `Você é Atena, uma assistente especializada em análise de dados financeiros. Seu papel é ajudar usuários a entenderem melhor os dados do dashboard financeiro da empresa. Seja clara, objetiva e use os dados fornecidos para dar respostas precisas.

Contexto do Dashboard:
${contexto}

Responda sempre em português brasileiro de forma profissional e amigável.`;

	const messages: Array<{
		role: "user" | "assistant" | "system";
		content: string;
	}> = [{ role: "system", content: systemPrompt }];

	if (historico) {
		messages.push(...historico);
	}

	messages.push({ role: "user", content: mensagem });

	const response = await fetchWithTimeout(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": process.env.API_URL || "http://localhost:3333",
				"X-Title": "Mais Gestão - Atena",
			},
			body: JSON.stringify({
				model: "openai/gpt-4o-mini",
				messages,
				temperature: 0.7,
				max_tokens: 1000,
			}),
		},
		FETCH_TIMEOUT_MS,
	);

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(
			error.error?.message ||
				`Erro ao chamar OpenRouter: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return (
		data.choices[0]?.message?.content ||
		"Desculpe, não consegui gerar uma resposta."
	);
}

export async function chatComAtenaService({
	idusuario,
	idempresa,
	mensagem,
	historico,
}: ChatComAtenaParametros): Promise<HttpResponse<RespostaIA>> {
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
				"Nenhuma API de IA configurada. Configure pelo menos uma API nas configurações de integrações.",
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
				"Nenhuma API de IA configurada. Configure pelo menos uma API nas configurações de integrações.",
		});
	}

	let contextoDashboard = "";

	try {
		const dadosResult = await buscarDadosDashboardService({
			idusuario,
			idempresa,
		});

		if (dadosResult.success && dadosResult.body) {
			const dados = dadosResult.body;
			contextoDashboard += `Dados Financeiros Atuais:
- Total de Contas a Pagar: R$ ${parseFloat(dados.totalContasPagar || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total de Contas a Receber: R$ ${parseFloat(dados.totalContasReceber || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Saldo Bancário: R$ ${parseFloat(dados.saldoBancario || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Saldo Caixa: R$ ${parseFloat(dados.saldoCaixa || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Quantidade de Usuários: ${dados.quantidadeUsuarios}
`;
		}

		const historicoResult = await buscarHistoricoFinanceiroService({
			idusuario,
			idempresa,
			dias: 30,
		});

		if (historicoResult.success && historicoResult.body) {
			const historicoFinanceiro = historicoResult.body;
			if (historicoFinanceiro.length > 0) {
				contextoDashboard += "\nHistórico Financeiro (últimos 30 dias):\n";
				historicoFinanceiro.slice(0, 10).forEach((item) => {
					contextoDashboard += `- ${item.date}: Contas a Pagar R$ ${item.contasPagar.toFixed(2)}, Contas a Receber R$ ${item.contasReceber.toFixed(2)}\n`;
				});
			}
		}

		const movimentacoesResult = await buscarUltimasMovimentacoesService({
			idusuario,
			idempresa,
		});

		if (movimentacoesResult.success && movimentacoesResult.body) {
			const movimentacoes = movimentacoesResult.body;
			contextoDashboard += "\nÚltimas Movimentações:\n";

			if (movimentacoes.pagar.length > 0) {
				contextoDashboard += "Contas a Pagar:\n";
				movimentacoes.pagar.slice(0, 5).forEach((item) => {
					contextoDashboard += `- ${item.descricao}: R$ ${parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.status})\n`;
				});
			}

			if (movimentacoes.receber.length > 0) {
				contextoDashboard += "Contas a Receber:\n";
				movimentacoes.receber.slice(0, 5).forEach((item) => {
					contextoDashboard += `- ${item.descricao}: R$ ${parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.status})\n`;
				});
			}
		}

		if (idempresa) {
			const empresa = await buscarEmpresaPorId(idempresa);
			if (empresa) {
				contextoDashboard += `\nEmpresa: ${empresa.nome}\n`;
			}
		}
	} catch (error) {
		console.error("Erro ao buscar dados do dashboard:", error);
	}

	contextoDashboard = truncarContexto(contextoDashboard);

	try {
		let resposta: string;

		switch (apiTipo) {
			case "openai":
				resposta = await chamarOpenAI(
					apiKey,
					mensagem,
					contextoDashboard,
					historicoNormalizado,
				);
				break;
			case "gemini":
				resposta = await chamarGemini(
					apiKey,
					mensagem,
					contextoDashboard,
					historicoNormalizado,
				);
				break;
			case "openrouter":
				resposta = await chamarOpenRouter(
					apiKey,
					mensagem,
					contextoDashboard,
					historicoNormalizado,
				);
				break;
			default:
				return httpBadRequest({ error: "API de IA não suportada" });
		}

		return httpOk({ resposta });
	} catch (error) {
		console.error("Erro ao chamar API de IA:", error);
		return httpBadGateway("Serviço de IA indisponível");
	}
}
