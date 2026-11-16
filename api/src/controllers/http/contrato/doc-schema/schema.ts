import type { FastifySchema } from "fastify";

export const criarContratoSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Criar contrato",
	security: [{ bearerAuth: [] }],
};

export const listarContratosSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Listar contratos",
	security: [{ bearerAuth: [] }],
};

export const buscarContratoSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Buscar contrato",
	security: [{ bearerAuth: [] }],
};

export const atualizarContratoSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Atualizar contrato",
	security: [{ bearerAuth: [] }],
};

export const excluirContratoSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Excluir contrato",
	security: [{ bearerAuth: [] }],
};
