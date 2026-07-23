import { z } from "zod";

const valoresServicoSchema = z.object({
	servicos: z.coerce.number().nonnegative(),
	iss: z.coerce.number().nonnegative().optional(),
	aliquota: z.coerce.number().nonnegative().optional(),
	pis: z.coerce.number().nonnegative().optional(),
	cofins: z.coerce.number().nonnegative().optional(),
	inss: z.coerce.number().nonnegative().optional(),
	ir: z.coerce.number().nonnegative().optional(),
	csll: z.coerce.number().nonnegative().optional(),
});

export const emissaoNfseSchema = z.object({
	iddestinatario: z.string().uuid("Selecione o tomador"),
	idnfseserie: z.string().uuid().optional(),
	confirmarProducao: z.boolean().optional(),
	itemListaServico: z.string().min(1, "Item LC 116 obrigatório"),
	discriminacao: z.string().min(1, "Discriminação obrigatória"),
	codigoCnae: z.string().optional(),
	codigoTributacaoMunicipio: z.string().optional(),
	codigoTributacaoNacional: z
		.string()
		.optional()
		.refine(
			(v) => !v || /^\d{6}$/.test(v),
			"Código de tributação nacional (cTribNac) deve ter 6 dígitos",
		),
	codigoNbs: z
		.string()
		.optional()
		.refine(
			(v) => !v || /^\d{9}$/.test(v),
			"Código NBS (cNBS) deve ter 9 dígitos",
		),
	codigoIndicadorOperacao: z
		.string()
		.optional()
		.refine(
			(v) => !v || /^\d{6}$/.test(v),
			"Indicador da operação (cIndOp) deve ter 6 dígitos",
		),
	exigibilidadeIss: z.string().default("1"),
	issRetido: z.string().default("2"),
	valores: valoresServicoSchema,
	competencia: z.string().optional(),
	dataEmissao: z.string().optional(),
	gerarFinanceiro: z.boolean().default(true),
	idplanocontas: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	idtipodocumento: z.string().uuid().optional(),
});

export type EmissaoNfseFormData = z.infer<typeof emissaoNfseSchema>;
