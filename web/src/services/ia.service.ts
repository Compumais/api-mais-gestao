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

export interface RespostaIA {
	resposta: string;
}

export const iaService = {
	async enviarMensagem(params: EnviarMensagemParams): Promise<RespostaIA> {
		const { data } = await api.post<RespostaIA>("/ia/chat", params);
		return data;
	},
};
