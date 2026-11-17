import { z } from "zod";

export const contratoFormSchema = z
	.object({
		identidade: z.string().min(1, "Selecione o cliente"),
		idtipocontrato: z.string().optional().nullable(),
		codigo: z.string().max(40).optional().nullable(),
		descricao: z.string().trim().min(1, "Informe a descrição").max(255),
		situacao: z.enum(["ativo", "suspenso", "encerrado"]),
		datainicio: z.string().min(1, "Informe a data de início"),
		datafim: z.string().optional().nullable(),
		valor: z.coerce.number().positive("Valor deve ser maior que zero"),
		periodicidade: z.literal("mensal"),
		diavencimento: z.coerce.number().int().min(1).max(28),
		regracompetencia: z.enum(["mes_atual", "mes_seguinte"]),
		fluxofaturamento: z.coerce.number().int().min(1).max(3),
		discriminacao: z.string().optional().nullable(),
		itemlistaservico: z.string().max(20).optional().nullable(),
		codigonbs: z.string().max(9).optional().nullable(),
		codigotributacaonacional: z.string().max(6).optional().nullable(),
		idcondicaopagto: z.string().optional().nullable(),
		idtipodocumento: z.string().min(1, "Informe o tipo de documento"),
		idplanocontas: z.string().optional().nullable(),
		idcontacorrente: z.string().optional().nullable(),
		idtipocobranca: z.string().optional().nullable(),
		observacao: z.string().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.fluxofaturamento === 1) {
			if (!data.itemlistaservico?.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["itemlistaservico"],
					message: "Obrigatório no fluxo 1",
				});
			}
			if (!data.discriminacao?.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["discriminacao"],
					message: "Obrigatório no fluxo 1",
				});
			}
			if (!data.idcontacorrente) {
				ctx.addIssue({
					code: "custom",
					path: ["idcontacorrente"],
					message: "Obrigatório nos fluxos 1 e 2",
				});
			}
		}
		if (data.fluxofaturamento === 2 && !data.idcontacorrente) {
			ctx.addIssue({
				code: "custom",
				path: ["idcontacorrente"],
				message: "Obrigatório nos fluxos 1 e 2",
			});
		}
	});

export type ContratoFormData = z.output<typeof contratoFormSchema>;
export type ContratoFormInput = z.input<typeof contratoFormSchema>;
