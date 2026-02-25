import { relations } from "drizzle-orm/relations";
import {
	auditLogs,
	contacorrente,
	contacorrentelancamento,
	contas,
	empresa,
	entidade,
	financeiro,
	financeirolancamento,
	motivobaixafinanceiro,
	notificacoes,
	planocontas,
	sessoes,
	tipodocumentofinanceiro,
	usuarioEmpresa,
	usuarios,
} from "./schema.js";

export const usuariosRelations = relations(usuarios, ({ many }) => ({
	empresas: many(empresa, {
		relationName: "proprietario",
	}),
	usuarioEmpresas: many(usuarioEmpresa),
	auditLogs: many(auditLogs),
	notificacoes: many(notificacoes),
	sessions: many(sessoes),
	accounts: many(contas),
}));

export const empresaRelations = relations(empresa, ({ one, many }) => ({
	proprietario: one(usuarios, {
		fields: [empresa.idproprietario],
		references: [usuarios.id],
		relationName: "proprietario",
	}),
	usuarioEmpresas: many(usuarioEmpresa),
	entidades: many(entidade),
	contacorrentes: many(contacorrente),
	financeiros: many(financeiro),
	planocontas: many(planocontas),
	notificacoes: many(notificacoes),
	tipodocumentofinanceiros: many(tipodocumentofinanceiro),
	motivobaixafinanceiros: many(motivobaixafinanceiro),
}));

export const usuarioEmpresaRelations = relations(usuarioEmpresa, ({ one }) => ({
	user: one(usuarios, {
		fields: [usuarioEmpresa.idusuario],
		references: [usuarios.id],
	}),
	empresa: one(empresa, {
		fields: [usuarioEmpresa.idempresa],
		references: [empresa.id],
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(usuarios, {
		fields: [auditLogs.idusuario],
		references: [usuarios.id],
	}),
}));

export const sessoesRelations = relations(sessoes, ({ one }) => ({
	user: one(usuarios, {
		fields: [sessoes.idusuario],
		references: [usuarios.id],
	}),
}));

export const contasRelations = relations(contas, ({ one }) => ({
	user: one(usuarios, {
		fields: [contas.idusuario],
		references: [usuarios.id],
	}),
}));

export const entidadeRelations = relations(entidade, ({ one }) => ({
	empresa: one(empresa, {
		fields: [entidade.idempresa],
		references: [empresa.id],
	}),
}));

export const financeiroRelations = relations(financeiro, ({ one, many }) => ({
	empresa: one(empresa, {
		fields: [financeiro.idempresa],
		references: [empresa.id],
	}),
	tipodocumentofinanceiro: one(tipodocumentofinanceiro, {
		fields: [financeiro.idtipodocumentofinanceiro],
		references: [tipodocumentofinanceiro.id],
	}),
	financeirolancamentos: many(financeirolancamento),
}));

export const planocontasRelations = relations(planocontas, ({ one }) => ({
	empresa: one(empresa, {
		fields: [planocontas.idempresa],
		references: [empresa.id],
	}),
}));

export const contacorrenteRelations = relations(
	contacorrente,
	({ one, many }) => ({
		empresa: one(empresa, {
			fields: [contacorrente.idempresa],
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

export const tipodocumentofinanceiroRelations = relations(
	tipodocumentofinanceiro,
	({ many, one }) => ({
		financeiros: many(financeiro),
		motivobaixafinanceiro: one(motivobaixafinanceiro, {
			fields: [tipodocumentofinanceiro.idmotivobaixafinanceiro],
			references: [motivobaixafinanceiro.id],
		}),
	}),
);

export const motivobaixafinanceiroRelations = relations(
	motivobaixafinanceiro,
	({ many }) => ({
		financeiros: many(tipodocumentofinanceiro),
	}),
);

export const notificacoesRelations = relations(notificacoes, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [notificacoes.idusuario],
		references: [usuarios.id],
	}),
	empresa: one(empresa, {
		fields: [notificacoes.idempresa],
		references: [empresa.id],
	}),
}));
