import { z } from "zod";

export const empresaFiscalConfigSchema = z.object({
	razaosocial: z.string().max(60).optional().nullable(),
	nomefantasia: z.string().max(60).optional().nullable(),
	inscricaoestadual: z.string().max(20).optional().nullable(),
	inscricaomunicipal: z.string().max(20).optional().nullable(),
	crt: z.number().int().min(1).max(4).optional().nullable(),
	cnae: z.string().max(7).optional().nullable(),
	indicadorie: z.number().int().optional().nullable(),
	logradouro: z.string().max(60).optional().nullable(),
	numero: z.string().max(10).optional().nullable(),
	complemento: z.string().max(60).optional().nullable(),
	bairro: z.string().max(60).optional().nullable(),
	cep: z.string().max(9).optional().nullable(),
	codigomunicipioibge: z.string().max(7).optional().nullable(),
	uf: z.string().length(2).optional().nullable(),
	codigopais: z.string().max(4).optional().nullable(),
	telefone: z.string().max(40).optional().nullable(),
	email: z.string().email().max(200).optional().nullable().or(z.literal("")),
	regimetributario: z
		.enum(["SN", "LP", "LR", ""])
		.optional()
		.nullable(),
});

export type EmpresaFiscalConfigFormData = z.infer<
	typeof empresaFiscalConfigSchema
>;
