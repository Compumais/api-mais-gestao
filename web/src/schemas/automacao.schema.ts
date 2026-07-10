import { z } from "zod";

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

export const automacaoFormSchema = z.object({
	nome: z.string().min(1, "Informe o nome").max(120),
	recorrencia: z.enum(["unica", "diaria", "semanal", "mensal"]),
	horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
	diames: z.coerce.number().int().min(1).max(28).optional(),
	diasemana: z.coerce.number().int().min(0).max(6).optional(),
	incluirSintegra: z.boolean(),
	incluirXml: z.boolean(),
	ativo: z.boolean(),
});

export type AutomacaoFormData = z.infer<typeof automacaoFormSchema>;
