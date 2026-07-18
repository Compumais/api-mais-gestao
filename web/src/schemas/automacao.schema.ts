import { z } from "zod";

export const FUNCAO_ENVIO_FISCAL_CONTABILIDADE =
	"envio_fiscal_contabilidade" as const;
export const FUNCAO_ALERTA_PENDENCIAS_NF = "alerta_pendencias_nf" as const;

export const FUNCOES_AUTOMACAO = [
	FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
	FUNCAO_ALERTA_PENDENCIAS_NF,
] as const;

export type FuncaoAutomacao = (typeof FUNCOES_AUTOMACAO)[number];

export const LABELS_FUNCAO_AUTOMACAO: Record<FuncaoAutomacao, string> = {
	envio_fiscal_contabilidade: "Envio fiscal à contabilidade (SINTEGRA / XMLs)",
	alerta_pendencias_nf: "Alerta de pendências NF-e / NFC-e",
};

export const contabilidadeCadastroSchema = z.object({
	nome: z.string().min(1, "Informe o nome").max(200),
	cnpj: z.string().max(18).optional(),
	emailprincipal: z
		.string()
		.min(1, "Informe o e-mail")
		.email("E-mail inválido")
		.max(200),
	emailsadicionais: z.string().optional(),
	ativo: z.boolean(),
});

export type ContabilidadeCadastroFormData = z.infer<
	typeof contabilidadeCadastroSchema
>;

export const automacaoFormSchema = z
	.object({
		nome: z.string().min(1, "Informe o nome").max(120),
		funcao: z.enum(FUNCOES_AUTOMACAO),
		recorrencia: z.enum(["unica", "diaria", "semanal", "mensal"]),
		horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
		diames: z.number().int().min(1).max(28).optional(),
		diasemana: z.number().int().min(0).max(6).optional(),
		incluirSintegra: z.boolean(),
		incluirXml: z.boolean(),
		incluirNfe: z.boolean(),
		incluirNfce: z.boolean(),
		ativo: z.boolean(),
	})
	.superRefine((dados, ctx) => {
		if (dados.funcao === FUNCAO_ENVIO_FISCAL_CONTABILIDADE) {
			if (!dados.incluirSintegra && !dados.incluirXml) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Selecione SINTEGRA e/ou XML",
					path: ["incluirSintegra"],
				});
			}
		}
		if (dados.funcao === FUNCAO_ALERTA_PENDENCIAS_NF) {
			if (!dados.incluirNfe && !dados.incluirNfce) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Selecione NF-e e/ou NFC-e",
					path: ["incluirNfe"],
				});
			}
		}
	});

export type AutomacaoFormData = z.infer<typeof automacaoFormSchema>;
