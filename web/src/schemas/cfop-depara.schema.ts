import { z } from "zod";

export const cfopDeParaFormSchema = z.object({
	idcfopentrada: z.string().min(1, "CFOP de entrada é obrigatório"),
	idcfopsaida: z.string().min(1, "CFOP de saída é obrigatório"),
	uf: z
		.string()
		.max(2, "UF deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
});

export type CfopDeParaFormData = z.infer<typeof cfopDeParaFormSchema>;
