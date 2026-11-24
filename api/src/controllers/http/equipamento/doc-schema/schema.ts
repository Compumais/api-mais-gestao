import type { FastifySchema } from "fastify";

const seguranca = [{ bearerAuth: [] }];

export const criarEquipamentoSchema: FastifySchema = {
	tags: ["equipamentos"],
	summary: "Criar equipamento de locação",
	security: seguranca,
};

export const listarEquipamentosSchema: FastifySchema = {
	tags: ["equipamentos"],
	summary: "Listar equipamentos de locação",
	security: seguranca,
};

export const buscarEquipamentoSchema: FastifySchema = {
	tags: ["equipamentos"],
	summary: "Buscar equipamento de locação",
	security: seguranca,
};

export const atualizarEquipamentoSchema: FastifySchema = {
	tags: ["equipamentos"],
	summary: "Atualizar equipamento de locação",
	security: seguranca,
};

export const excluirEquipamentoSchema: FastifySchema = {
	tags: ["equipamentos"],
	summary: "Excluir equipamento de locação",
	security: seguranca,
};
