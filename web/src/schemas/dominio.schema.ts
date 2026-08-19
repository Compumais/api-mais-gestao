import { z } from "zod";

export const dominioIntegracaoFormSchema = z.object({
	chavecontador: z.string().max(200).optional(),
	boxefile: z.boolean(),
	habilitado: z.boolean(),
});

export type DominioIntegracaoFormData = z.infer<
	typeof dominioIntegracaoFormSchema
>;
