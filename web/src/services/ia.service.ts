import { api } from "@/lib/axios";

export interface MensagemChat {
	role: "user" | "assistant";
	content: string;
}

export interface EnviarMensagemParams {
	mensagem: string;
	idempresa?: string;
	historico?: MensagemChat[];
}

export interface AcaoIA {
	nome: string;
	status: "sucesso" | "erro" | "bloqueado";
	resumo: string;
}

export interface RespostaIA {
	resposta: string;
	acoes?: AcaoIA[];
}

export type ProvedorIa = "openai" | "gemini" | "openrouter";

export interface TestarIaParams {
	idempresa: string;
	provedor: ProvedorIa;
	apiKey?: string;
	modelo?: string;
}

export interface ResultadoTesteIa {
	ok: boolean;
	provedor: ProvedorIa;
	modelo: string;
	mensagem: string;
	respostaModelo?: string;
}

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

export const iaService = {
	async enviarMensagem(params: EnviarMensagemParams): Promise<RespostaIA> {
		const { data } = await api.post<RespostaIA>("/ia/chat", params);
		return data;
	},

	async testar(params: TestarIaParams): Promise<ResultadoTesteIa> {
		const { data } = await api.post<ResultadoTesteIa>("/ia/testar", params);
		return data;
	},
};
