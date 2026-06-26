import { z } from "zod";

const pagamentoErpSchema = z.object({
	idtipodocumentofinanceiro: z.string().uuid(),
	valor: z.string(),
});

export const fecharContaSchema = z.object({
	valordinheiro: z.string().optional(),
	valorcartao: z.string().optional(),
	valorcartaocredito: z.string().optional(),
	valorcartaodebito: z.string().optional(),
	valorpix: z.string().optional(),
	valorprepago: z.string().optional(),
	desconto: z.string().optional(),
	valortaxaservico: z.string().optional(),
	valorcouverartistico: z.string().optional(),
	identidade: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	pagamentosErp: z.array(pagamentoErpSchema).optional(),
});

export type FecharContaFormData = z.infer<typeof fecharContaSchema>;
