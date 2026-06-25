import { z } from "zod";

export const importarOfxSchema = z.object({
	idcontacorrente: z.string().uuid("Selecione uma conta corrente"),
});

export type ImportarOfxFormData = z.infer<typeof importarOfxSchema>;
