import { relations } from "drizzle-orm/relations";
import {
	auditLogs,
	cliente,
	contacorrente,
	contacorrentelancamento,
	contas,
	empresa,
	financeiro,
	financeirolancamento,
	planocontas,
	sessoes,
	usuarioEmpresa,
	usuarios,
} from "./schema.js";

export const usuariosRelations = relations(usuarios, ({ many }) => ({
	empresas: many(empresa, {
		relationName: "proprietario",
	}),
	usuarioEmpresas: many(usuarioEmpresa),
	auditLogs: many(auditLogs),
	sessions: many(sessoes),
	accounts: many(contas),
}));

export const empresaRelations = relations(empresa, ({ one, many }) => ({
	proprietario: one(usuarios, {
		fields: [empresa.proprietarioId],
		references: [usuarios.id],
		relationName: "proprietario",
	}),
	usuarioEmpresas: many(usuarioEmpresa),
	clientes: many(cliente),
	contacorrentes: many(contacorrente),
	financeiros: many(financeiro),
	planocontas: many(planocontas),
}));

export const usuarioEmpresaRelations = relations(usuarioEmpresa, ({ one }) => ({
	user: one(usuarios, {
		fields: [usuarioEmpresa.userId],
		references: [usuarios.id],
	}),
	empresa: one(empresa, {
		fields: [usuarioEmpresa.empresaId],
		references: [empresa.id],
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(usuarios, {
		fields: [auditLogs.userId],
		references: [usuarios.id],
	}),
}));

export const sessoesRelations = relations(sessoes, ({ one }) => ({
	user: one(usuarios, {
		fields: [sessoes.userId],
		references: [usuarios.id],
	}),
}));

export const contasRelations = relations(contas, ({ one }) => ({
	user: one(usuarios, {
		fields: [contas.userId],
		references: [usuarios.id],
	}),
}));

export const clienteRelations = relations(cliente, ({ one }) => ({
	empresa: one(empresa, {
		fields: [cliente.empresaId],
		references: [empresa.id],
	}),
}));

export const financeiroRelations = relations(financeiro, ({ one, many }) => ({
	empresa: one(empresa, {
		fields: [financeiro.empresaId],
		references: [empresa.id],
	}),
	financeirolancamentos: many(financeirolancamento),
}));

export const planocontasRelations = relations(planocontas, ({ one }) => ({
	empresa: one(empresa, {
		fields: [planocontas.empresaId],
		references: [empresa.id],
	}),
}));

export const contacorrenteRelations = relations(
	contacorrente,
	({ one, many }) => ({
		empresa: one(empresa, {
			fields: [contacorrente.empresaId],
			references: [empresa.id],
		}),
		lancamentos: many(contacorrentelancamento),
	}),
);

export const contacorrentelancamentoRelations = relations(
	contacorrentelancamento,
	({ one }) => ({
		contacorrente: one(contacorrente, {
			fields: [contacorrentelancamento.idcontacorrente],
			references: [contacorrente.id],
		}),
	}),
);

export const financeirolancamentoRelations = relations(
	financeirolancamento,
	({ one }) => ({
		financeiro: one(financeiro, {
			fields: [financeirolancamento.idfinanceiro],
			references: [financeiro.id],
		}),
	}),
);
