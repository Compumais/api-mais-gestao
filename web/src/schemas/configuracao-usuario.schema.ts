import { z } from "zod";

export const atualizarConfiguracaoUsuarioSchema = z.object({
	geminiApiKey: z.string().optional(),
	openaiApiKey: z.string().optional(),
	openrouterApiKey: z.string().optional(),
	asaasToken: z.string().optional(),
});

export type AtualizarConfiguracaoUsuarioFormData = z.infer<
	typeof atualizarConfiguracaoUsuarioSchema
>;

