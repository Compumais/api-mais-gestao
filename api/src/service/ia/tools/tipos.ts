import type { z } from "zod/v4";

export type ContextoTool = {
	idusuario: string;
	idempresa: string;
};

export type ResultadoTool = {
	ok: boolean;
	resumo: string;
	dados?: unknown;
};

export type AcaoExecutada = {
	nome: string;
	status: "sucesso" | "erro" | "bloqueado";
	resumo: string;
};

export type DefinicaoTool = {
	nome: string;
	descricao: string;
	mutavel: boolean;
	schema: z.ZodType;
	executar: (
		ctx: ContextoTool,
		args: Record<string, unknown>,
	) => Promise<ResultadoTool>;
};

export type MensagemChat = {
	role: "user" | "assistant";
	content: string;
};

export type RespostaAgente = {
	resposta: string;
	acoes: AcaoExecutada[];
};
