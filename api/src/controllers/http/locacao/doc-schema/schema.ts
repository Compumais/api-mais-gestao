import type { FastifySchema } from "fastify";

const seguranca = [{ bearerAuth: [] }];

export const criarLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Abrir locação de equipamentos",
	security: seguranca,
};

export const listarLocacoesSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Listar locações",
	security: seguranca,
};

export const buscarLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Buscar locação",
	security: seguranca,
};

export const atualizarLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Atualizar locação aberta",
	security: seguranca,
};

export const fecharLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Fechar locação e gerar financeiro",
	security: seguranca,
};

export const preverFechamentoLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Prévia do fechamento da locação",
	security: seguranca,
};

export const cancelarLocacaoSchema: FastifySchema = {
	tags: ["locacoes"],
	summary: "Cancelar locação aberta",
	security: seguranca,
};
