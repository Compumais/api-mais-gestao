import { z } from "zod";

const meiosPagamentoNfceSchema = z.object({
	dinheiro: z.boolean(),
	cartao: z.boolean(),
	pix: z.boolean(),
	prepago: z.boolean(),
});

export const nfceConfiguracaoSchema = z.object({
	ambiente: z.coerce.number().int().min(1).max(2),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	idcsc_homologacao: z.string().max(6).nullable().optional(),
	csctoken_homologacao: z.string().max(36).nullable().optional(),
	idcsc_producao: z.string().max(6).nullable().optional(),
	csctoken_producao: z.string().max(36).nullable().optional(),
	contingenciaativa: z.boolean().optional(),
	meiospagamentonfce: meiosPagamentoNfceSchema.optional(),
});

export type NfceConfiguracaoFormData = z.infer<typeof nfceConfiguracaoSchema>;
