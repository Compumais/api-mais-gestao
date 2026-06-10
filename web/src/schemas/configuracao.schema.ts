import { z } from "zod";

// Schema para configurações de notificações
export const configuracaoNotificacoesSchema = z.object({
	alertasFinanceiros: z.object({
		vencimentoContas: z.object({
			habilitado: z.boolean(),
			diasAntes: z.number().min(1).max(365),
		}),
		saldoBaixo: z.object({
			habilitado: z.boolean(),
			valorMinimo: z.string().min(1),
		}),
		transferenciasAcimaValor: z.object({
			habilitado: z.boolean(),
			valorLimite: z.string().min(1),
		}),
		conciliacoesPendentes: z.object({
			habilitado: z.boolean(),
			diasPendentes: z.number().min(1).max(365),
		}),
	}),
	notificacoesEmail: z.object({
		relatoriosAutomaticos: z.object({
			habilitado: z.boolean(),
			frequencia: z.enum(["diario", "semanal", "mensal"]).nullable(),
			horario: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
		}),
		resumoMovimentacoes: z.object({
			habilitado: z.boolean(),
			frequencia: z.enum(["diario", "semanal", "mensal"]).nullable(),
		}),
		alertasVencimento: z.object({
			habilitado: z.boolean(),
			diasAntes: z.number().min(1).max(365),
		}),
	}),
});

// Schema para configurações de integração
export const configuracaoIntegracaoSchema = z.object({
	apis: z.object({
		chaves: z.array(
			z.object({
				id: z.string(),
				nome: z.string(),
				chave: z.string(),
				criadoEm: z.string(),
				ultimoUso: z.string().nullable(),
				ativo: z.boolean(),
			}),
		),
	}),
	webhooks: z.array(
		z.object({
			id: z.string(),
			url: z.string().url(),
			eventos: z.array(z.string()),
			ativo: z.boolean(),
			criadoEm: z.string(),
		}),
	),
	integracoesBancos: z.object({
		habilitado: z.boolean(),
		provedor: z.string().nullable(),
		configuracoes: z.record(z.string(), z.unknown()),
	}),
	exportacao: z.object({
		formatoPadrao: z.enum(["csv", "excel", "pdf"]),
		incluirCabecalho: z.boolean(),
		separador: z.string(),
	}),
	backup: z.object({
		habilitado: z.boolean(),
		frequencia: z.enum(["diario", "semanal", "mensal"]).nullable(),
		horario: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
		manterBackups: z.number().min(1).max(365),
	}),
});

// Schema para configurações de relatórios
export const configuracaoRelatoriosSchema = z.object({
	templates: z.array(
		z.object({
			id: z.string(),
			nome: z.string(),
			tipo: z.string(),
			configuracoes: z.record(z.string(), z.unknown()),
		}),
	),
	padroes: z.object({
		periodo: z.enum(["mes", "trimestre", "semestre", "ano", "personalizado"]),
		agrupamentos: z.array(z.string()),
		filtros: z.record(z.string(), z.unknown()),
	}),
});

// Schema para configurações de impressão
export const configuracaoImpressaoSchema = z.object({
	cabecalho: z.object({
		texto: z.string().nullable(),
		logo: z.string().nullable(),
	}),
	rodape: z.object({
		texto: z.string().nullable(),
	}),
	documentosFiscais: z.object({
		incluirLogo: z.boolean(),
		incluirDadosEmpresa: z.boolean(),
		dadosEmpresa: z.object({
			razaoSocial: z.boolean(),
			cnpj: z.boolean(),
			endereco: z.boolean(),
			contato: z.boolean(),
		}),
	}),
});

// Schema completo
export const configuracaoCompletaSchema = z.object({
	id: z.string(),
	idempresa: z.string(),
	notificacoes: configuracaoNotificacoesSchema,
	integracao: configuracaoIntegracaoSchema,
	relatorios: configuracaoRelatoriosSchema,
	impressao: configuracaoImpressaoSchema,
	criadoem: z.string(),
	atualizadoem: z.string(),
});

// Schemas para formulários
export const criarChaveApiSchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
});

export const criarWebhookSchema = z.object({
	url: z.string().url("URL inválida"),
	eventos: z.array(z.string()).min(1, "Pelo menos um evento é obrigatório"),
});

export const atualizarWebhookSchema = z.object({
	url: z.string().url("URL inválida").optional(),
	eventos: z.array(z.string()).optional(),
	ativo: z.boolean().optional(),
});

export type ConfiguracaoNotificacoesFormData = z.infer<
	typeof configuracaoNotificacoesSchema
>;
export type ConfiguracaoIntegracaoFormData = z.infer<
	typeof configuracaoIntegracaoSchema
>;
export type ConfiguracaoRelatoriosFormData = z.infer<
	typeof configuracaoRelatoriosSchema
>;
export type ConfiguracaoImpressaoFormData = z.infer<
	typeof configuracaoImpressaoSchema
>;
export type CriarChaveApiFormData = z.infer<typeof criarChaveApiSchema>;
export type CriarWebhookFormData = z.infer<typeof criarWebhookSchema>;
export type AtualizarWebhookFormData = z.infer<typeof atualizarWebhookSchema>;
