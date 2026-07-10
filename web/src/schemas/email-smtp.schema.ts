import { z } from "zod";

export const configuracaoSmtpSchema = z.object({
	host: z.string().min(1, "Informe o host SMTP").max(200),
	porta: z.coerce.number().int().min(1, "Informe a porta").max(65535),
	seguro: z.boolean(),
	usuario: z.string().min(1, "Informe o usuário").max(200),
	senha: z.string().max(500).optional(),
	emailremetente: z
		.string()
		.min(1, "Informe o e-mail remetente")
		.email("E-mail remetente inválido")
		.max(200),
	nomremetente: z.string().max(120).optional(),
	ativo: z.boolean(),
});

export type ConfiguracaoSmtpFormData = z.infer<typeof configuracaoSmtpSchema>;
