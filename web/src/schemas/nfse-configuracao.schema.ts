import { z } from "zod";

export const nfseConfiguracaoSchema = z.object({
	ambiente: z.coerce.number().int().min(1).max(2),
	provedor: z.string().min(1),
	codigomunicipioibge: z.string().optional().nullable(),
	versaolayout: z.string().default("2.02"),
	urlwsdl: z.string().optional().nullable(),
	usarlotesincrono: z.boolean().default(true),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	ultimaidserie: z.string().uuid().nullable().optional(),
});

export type NfseConfiguracaoFormData = z.infer<typeof nfseConfiguracaoSchema>;
