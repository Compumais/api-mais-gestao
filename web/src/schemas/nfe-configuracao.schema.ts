import { z } from "zod";

export const nfeConfiguracaoSchema = z.object({
	ambiente: z.coerce.number().int().min(1).max(2),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	tokenibpt: z.string().max(100).nullable().optional(),
	emailenvioxml: z.string().email().max(200).nullable().optional().or(z.literal("")),
	infresptec_cnpj: z.string().max(14).nullable().optional(),
	infresptec_nome: z.string().max(60).nullable().optional(),
	infresptec_email: z.string().email().max(200).nullable().optional().or(z.literal("")),
	infresptec_fone: z.string().max(20).nullable().optional(),
	contingenciaativa: z.boolean().optional(),
});

export type NfeConfiguracaoFormData = z.infer<typeof nfeConfiguracaoSchema>;

export const nfeSerieSchema = z.object({
	serie: z.string().min(1).max(3),
	numeroproximo: z.coerce.number().int().min(1),
	padrao: z.boolean(),
	ativo: z.boolean(),
});

export type NfeSerieFormData = z.infer<typeof nfeSerieSchema>;

export const certificadoDigitalUploadSchema = z.object({
	apelido: z.string().min(1).max(100),
	senha: z.string().min(1),
});

export type CertificadoDigitalUploadFormData = z.infer<
	typeof certificadoDigitalUploadSchema
>;
