import { z } from "zod";

const horarioSchema = z
	.string()
	.regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Horário inválido (use HH:MM)");

const frequenciaSchema = z.enum(["diario", "semanal", "mensal"]);

const valorMonetarioSchema = z
	.string()
	.min(1, "Valor é obrigatório")
	.refine((valor) => {
		const normalizado = valor.replace(",", ".");
		const numero = Number(normalizado);
		return Number.isFinite(numero) && numero >= 0;
	}, "Valor monetário inválido");

export const configuracaoNotificacoesSchema = z
	.object({
		alertasFinanceiros: z.object({
			vencimentoContas: z.object({
				habilitado: z.boolean(),
				diasAntes: z.number().int().min(1).max(365),
			}),
			saldoBaixo: z.object({
				habilitado: z.boolean(),
				valorMinimo: valorMonetarioSchema,
			}),
			transferenciasAcimaValor: z.object({
				habilitado: z.boolean(),
				valorLimite: valorMonetarioSchema,
			}),
			conciliacoesPendentes: z.object({
				habilitado: z.boolean(),
				diasPendentes: z.number().int().min(1).max(365),
			}),
		}),
		notificacoesEmail: z.object({
			relatoriosAutomaticos: z.object({
				habilitado: z.boolean(),
				frequencia: frequenciaSchema.nullable(),
				horario: horarioSchema,
			}),
			resumoMovimentacoes: z.object({
				habilitado: z.boolean(),
				frequencia: frequenciaSchema.nullable(),
			}),
			alertasVencimento: z.object({
				habilitado: z.boolean(),
				diasAntes: z.number().int().min(1).max(365),
			}),
		}),
	})
	.superRefine((dados, ctx) => {
		if (
			dados.notificacoesEmail.relatoriosAutomaticos.habilitado &&
			!dados.notificacoesEmail.relatoriosAutomaticos.frequencia
		) {
			ctx.addIssue({
				code: "custom",
				path: ["notificacoesEmail", "relatoriosAutomaticos", "frequencia"],
				message: "Frequência é obrigatória quando relatórios automáticos estão habilitados",
			});
		}

		if (
			dados.notificacoesEmail.resumoMovimentacoes.habilitado &&
			!dados.notificacoesEmail.resumoMovimentacoes.frequencia
		) {
			ctx.addIssue({
				code: "custom",
				path: ["notificacoesEmail", "resumoMovimentacoes", "frequencia"],
				message:
					"Frequência é obrigatória quando resumo de movimentações está habilitado",
			});
		}

		if (dados.alertasFinanceiros.saldoBaixo.habilitado) {
			const valor = Number(
				dados.alertasFinanceiros.saldoBaixo.valorMinimo.replace(",", "."),
			);
			if (valor <= 0) {
				ctx.addIssue({
					code: "custom",
					path: ["alertasFinanceiros", "saldoBaixo", "valorMinimo"],
					message: "Valor mínimo deve ser maior que zero quando o alerta está habilitado",
				});
			}
		}
	});

export type ConfiguracaoNotificacoesValidada = z.infer<
	typeof configuracaoNotificacoesSchema
>;

export function parseConfiguracaoNotificacoes(dados: unknown) {
	return configuracaoNotificacoesSchema.parse(dados);
}
