import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	foreignKey,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const configuracoes = pgTable(
	"configuracoes",
	{
		id: text()
			.primaryKey()
			.notNull()
			.$defaultFn(() => randomUUID()),
		idempresa: text().notNull(),
		// Configurações de notificações
		notificacoes: jsonb("notificacoes")
			.$type<{
				alertasFinanceiros: {
					vencimentoContas: {
						habilitado: boolean;
						diasAntes: number;
					};
					saldoBaixo: {
						habilitado: boolean;
						valorMinimo: string;
					};
					transferenciasAcimaValor: {
						habilitado: boolean;
						valorLimite: string;
					};
					conciliacoesPendentes: {
						habilitado: boolean;
						diasPendentes: number;
					};
				};
				notificacoesEmail: {
					relatoriosAutomaticos: {
						habilitado: boolean;
						frequencia: "diario" | "semanal" | "mensal" | null;
						horario: string;
					};
					resumoMovimentacoes: {
						habilitado: boolean;
						frequencia: "diario" | "semanal" | "mensal" | null;
					};
					alertasVencimento: {
						habilitado: boolean;
						diasAntes: number;
					};
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de integração
		integracao: jsonb("integracao")
			.$type<{
				apis: {
					chaves: Array<{
						id: string;
						nome: string;
						chave: string;
						criadoEm: string;
						ultimoUso: string | null;
						ativo: boolean;
					}>;
				};
				webhooks: Array<{
					id: string;
					url: string;
					eventos: string[];
					ativo: boolean;
					criadoEm: string;
				}>;
				integracoesBancos: {
					habilitado: boolean;
					provedor: string | null;
					configuracoes: Record<string, unknown>;
				};
				exportacao: {
					formatoPadrao: "csv" | "excel" | "pdf";
					incluirCabecalho: boolean;
					separador: string;
				};
				backup: {
					habilitado: boolean;
					frequencia: "diario" | "semanal" | "mensal" | null;
					horario: string;
					manterBackups: number;
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de relatórios
		relatorios: jsonb("relatorios")
			.$type<{
				templates: Array<{
					id: string;
					nome: string;
					tipo: string;
					configuracoes: Record<string, unknown>;
				}>;
				padroes: {
					periodo: "mes" | "trimestre" | "semestre" | "ano" | "personalizado";
					agrupamentos: string[];
					filtros: Record<string, unknown>;
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de impressão
		impressao: jsonb("impressao")
			.$type<{
				cabecalho: {
					texto: string | null;
					logo: string | null;
				};
				rodape: {
					texto: string | null;
				};
				documentosFiscais: {
					incluirLogo: boolean;
					incluirDadosEmpresa: boolean;
					dadosEmpresa: {
						razaoSocial: boolean;
						cnpj: boolean;
						endereco: boolean;
						contato: boolean;
					};
				};
			}>()
			.default(sql`'{}'::jsonb`),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("configuracoes_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "configuracoes_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
