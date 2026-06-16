import { z } from "zod";

export const fecharContaSchema = z.object({
	valordinheiro: z.string().optional(),
	valorcartao: z.string().optional(),
	valorpix: z.string().optional(),
	valorprepago: z.string().optional(),
	desconto: z.string().optional(),
	valortaxaservico: z.string().optional(),
	valorcouverartistico: z.string().optional(),
});

export type FecharContaFormData = z.infer<typeof fecharContaSchema>;
