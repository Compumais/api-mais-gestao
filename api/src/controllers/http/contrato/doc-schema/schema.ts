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

export const previewImportacaoContratosSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Preview da importação de contratos",
	security: [{ bearerAuth: [] }],
};

export const importarContratosSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Importar contratos via CSV/XLSX",
	security: [{ bearerAuth: [] }],
};

export const vincularClienteImportacaoContratosSchema: FastifySchema = {
	tags: ["contratos"],
	summary: "Cadastrar ou associar cliente pendente da importação de contratos",
	security: [{ bearerAuth: [] }],
};
