import { z } from "zod";

export const empresaFiscalSchema = z.object({
	regimetributario: z
		.enum(["SN", "LP", "LR", ""], {
			message: "Regime tributário inválido",
		})
		.optional()
		.nullable(),
});

export type EmpresaFiscalFormData = z.infer<typeof empresaFiscalSchema>;
