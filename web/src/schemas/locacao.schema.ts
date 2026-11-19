import { z } from "zod";

export const locacaoFormSchema = z
	.object({
		identidade: z.string().min(1, "Selecione o cliente"),
		codigo: z.string().trim().min(1, "Informe o código").max(40),
		datainicio: z.string().min(1, "Informe a data de início"),
		cep: z.string().max(9).optional(),
		endereco: z.string().max(120).optional(),
		numeroendereco: z.string().max(20).optional(),
		complemento: z.string().max(60).optional(),
		bairro: z.string().max(60).optional(),
		idestado: z.string().optional(),
		idcidade: z.string().optional(),
		observacao: z.string().optional(),
		itens: z
			.array(
				z.object({
					idequipamento: z.string().min(1, "Selecione o equipamento"),
					periodo: z.enum(["diaria", "semanal", "quinzenal", "mensal"]),
					quantidade: z.number().int().min(1, "Informe a quantidade"),
				}),
			)
			.min(1, "Informe ao menos um equipamento"),
	})
	.superRefine((dados, ctx) => {
		const vistos = new Set<string>();
		dados.itens.forEach((item, indice) => {
			if (!item.idequipamento) return;
			if (vistos.has(item.idequipamento)) {
				ctx.addIssue({
					code: "custom",
					path: ["itens", indice, "idequipamento"],
					message: "Equipamento repetido",
				});
			}
			vistos.add(item.idequipamento);
		});
	});

export type LocacaoFormData = z.infer<typeof locacaoFormSchema>;

export const fecharLocacaoSchema = z
	.object({
		datadevolucao: z.string().min(1, "Informe a data de devolução"),
		formapagamento: z.enum(["prazo", "avista"]),
		idplanocontas: z.string().min(1, "Selecione o plano de contas"),
		idtipodocumento: z.string().optional(),
		vencimento: z.string().optional(),
		idcontacorrente: z.string().optional(),
	})
	.superRefine((dados, ctx) => {
		if (dados.formapagamento === "prazo") {
			if (!dados.idtipodocumento) {
				ctx.addIssue({
					code: "custom",
					path: ["idtipodocumento"],
					message: "Selecione o tipo de documento",
				});
			}
			if (!dados.vencimento) {
				ctx.addIssue({
					code: "custom",
					path: ["vencimento"],
					message: "Informe o vencimento",
				});
			}
		}
		if (dados.formapagamento === "avista" && !dados.idcontacorrente) {
			ctx.addIssue({
				code: "custom",
				path: ["idcontacorrente"],
				message: "Selecione o caixa ou a conta corrente",
			});
		}
	});

export type FecharLocacaoFormData = z.infer<typeof fecharLocacaoSchema>;
