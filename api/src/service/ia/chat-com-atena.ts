import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import {
	buscarDadosDashboardService,
	buscarHistoricoFinanceiroService,
} from "@/service/dashboard/buscar-dados-dashboard.js";
import { buscarUltimasMovimentacoesService } from "@/service/dashboard/buscar-ultimas-movimentacoes.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

interface ChatComAtenaParametros {
	idusuario: string;
	idempresa: string;
	mensagem: string;
	historico?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface RespostaIA {
	resposta: string;
}

// Função para chamar OpenAI API
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

	// Adicionar histórico se fornecido
	if (historico) {
		messages.push(...historico);
	}

	// Adicionar mensagem atual
	messages.push({ role: "user", content: mensagem });

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(
			error.error?.message || `Erro ao chamar OpenAI: ${response.statusText}`,
		);
	}

	const data = await response.json();
	return (
		data.choices[0]?.message?.content ||
		"Desculpe, não consegui gerar uma resposta."
	);
}

// Função para chamar Gemini API
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

	// Construir histórico de conversa para Gemini
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

	// Adicionar mensagem atual
	conversationHistory.push({
		role: "user",
		parts: [{ text: `${systemPrompt}\n\nPergunta do usuário: ${mensagem}` }],
	});

	const response = await fetch(
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

// Função para chamar OpenRouter API
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

	// Adicionar histórico se fornecido
	if (historico) {
		messages.push(...historico);
	}

	// Adicionar mensagem atual
	messages.push({ role: "user", content: mensagem });

	const response = await fetch(
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

	// Buscar configurações de IA do usuário/proprietário
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

	// Selecionar API (prioridade: OpenAI > Gemini > OpenRouter)
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

	// Buscar dados do dashboard para contexto
	let contextoDashboard = "";

	try {
		// Buscar dados principais
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

		// Buscar histórico financeiro (últimos 30 dias)
		const historicoResult = await buscarHistoricoFinanceiroService({
			idusuario,
			idempresa,
			dias: 30,
		});

		if (historicoResult.success && historicoResult.body) {
			const historico = historicoResult.body;
			if (historico.length > 0) {
				contextoDashboard += `\nHistórico Financeiro (últimos 30 dias):\n`;
				historico.slice(0, 10).forEach((item) => {
					contextoDashboard += `- ${item.date}: Contas a Pagar R$ ${item.contasPagar.toFixed(2)}, Contas a Receber R$ ${item.contasReceber.toFixed(2)}\n`;
				});
			}
		}

		// Buscar últimas movimentações
		const movimentacoesResult = await buscarUltimasMovimentacoesService({
			idusuario,
			idempresa,
		});

		if (movimentacoesResult.success && movimentacoesResult.body) {
			const movimentacoes = movimentacoesResult.body;
			contextoDashboard += `\nÚltimas Movimentações:\n`;

			if (movimentacoes.pagar.length > 0) {
				contextoDashboard += `Contas a Pagar:\n`;
				movimentacoes.pagar.slice(0, 5).forEach((item) => {
					contextoDashboard += `- ${item.descricao}: R$ ${parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.status})\n`;
				});
			}

			if (movimentacoes.receber.length > 0) {
				contextoDashboard += `Contas a Receber:\n`;
				movimentacoes.receber.slice(0, 5).forEach((item) => {
					contextoDashboard += `- ${item.descricao}: R$ ${parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.status})\n`;
				});
			}
		}

		// Adicionar informações da empresa se disponível
		if (idempresa) {
			const empresa = await buscarEmpresaPorId(idempresa);
			if (empresa) {
				contextoDashboard += `\nEmpresa: ${empresa.nome}\n`;
			}
		}
	} catch (error) {
		console.error("Erro ao buscar dados do dashboard:", error);
		// Continuar mesmo se houver erro ao buscar dados
	}

	// Chamar API de IA selecionada
	try {
		let resposta: string;

		switch (apiTipo) {
			case "openai":
				resposta = await chamarOpenAI(
					apiKey,
					mensagem,
					contextoDashboard,
					historico,
				);
				break;
			case "gemini":
				resposta = await chamarGemini(
					apiKey,
					mensagem,
					contextoDashboard,
					historico,
				);
				break;
			case "openrouter":
				resposta = await chamarOpenRouter(
					apiKey,
					mensagem,
					contextoDashboard,
					historico,
				);
				break;
			default:
				return httpBadRequest({ error: "API de IA não suportada" });
		}

		return httpOk({ resposta });
	} catch (error) {
		console.error("Erro ao chamar API de IA:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Erro desconhecido ao processar mensagem";
		return httpBadRequest({
			error: `Erro ao processar mensagem: ${errorMessage}`,
		});
	}
}
