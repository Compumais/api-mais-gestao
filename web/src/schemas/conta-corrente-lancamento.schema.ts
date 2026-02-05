import { z } from "zod";

export const criarContaCorrenteLancamentoSchema = z
	.object({
		idcontacorrente: z.string().optional(),
		operacao: z.enum(["entrada", "saida", "transferencia"]),
		idcontacorrenteOrigem: z.string().optional(),
		idcontacorrenteDestino: z.string().optional(),
		data: z.string().min(1, "Data é obrigatória"),
		valor: z
			.string()
			.min(1, "Valor é obrigatório")
			.refine(
				(val) => {
					const num = Number(val);
					return !Number.isNaN(num) && num > 0;
				},
				{ message: "Valor deve ser um número maior que zero" },
			),
		idplanocontas: z.string().optional(),
		dataconciliacao: z.string().optional(),
		historico: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.operacao === "transferencia") {
				return !!data.idcontacorrenteOrigem && !!data.idcontacorrenteDestino;
			}
			return !!data.idcontacorrente;
		},
		{
			message: "Conta corrente é obrigatória",
			path: ["idcontacorrente"],
		},
	)
	.refine(
		(data) => {
			if (data.operacao === "transferencia") {
				return data.idcontacorrenteOrigem !== data.idcontacorrenteDestino;
			}
			return true;
		},
		{
			message: "As contas de origem e destino devem ser diferentes",
			path: ["idcontacorrenteDestino"],
		},
	);

export const atualizarContaCorrenteLancamentoSchema = z.object({
	operacao: z.enum(["entrada", "saida"]).optional(),
	data: z.string().optional(),
	valor: z
		.string()
		.optional()
		.refine(
			(val) => {
				if (!val) return true;
				const num = Number(val);
				return !Number.isNaN(num) && num > 0;
			},
			{ message: "Valor deve ser um número maior que zero" },
		),
	idplanocontas: z.string().optional(),
	dataconciliacao: z.string().optional(),
	historico: z.string().optional(),
});

export type CriarContaCorrenteLancamentoFormData = z.infer<
	typeof criarContaCorrenteLancamentoSchema
>;
export type AtualizarContaCorrenteLancamentoFormData = z.infer<
	typeof atualizarContaCorrenteLancamentoSchema
>;
