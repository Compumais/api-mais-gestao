import { z } from "zod";

const urlsOperacaoSchema = z
	.object({
		emissao: z.string().optional().nullable(),
		consulta: z.string().optional().nullable(),
		cancelamento: z.string().optional().nullable(),
	})
	.optional()
	.nullable();

export const nfseConfiguracaoSchema = z.object({
	ambiente: z.coerce.number().int().min(1).max(2),
	provedor: z.string().min(1),
	codigomunicipioibge: z.string().optional().nullable(),
	versaolayout: z.enum(["2.02", "dps-1.01"]).or(z.string().min(1)).default("2.02"),
	urlwsdl: z.string().optional().nullable(),
	urlsoperacao: urlsOperacaoSchema,
	usarlotesincrono: z.boolean().default(true),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	ultimaidserie: z.string().uuid().nullable().optional(),
});

export type NfseConfiguracaoFormData = z.infer<typeof nfseConfiguracaoSchema>;
