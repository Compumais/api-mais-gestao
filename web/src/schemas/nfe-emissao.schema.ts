import { z } from "zod";

export const itemNfeSchema = z.object({
	idproduto: z.string().uuid().optional(),
	codigoProduto: z.string().optional(),
	ean: z.string().optional(),
	eanTributavel: z.string().optional(),
	descricao: z.string().min(1, "Descrição obrigatória"),
	ncm: z.string().min(1, "NCM obrigatório"),
	cfop: z.string().min(4, "CFOP obrigatório"),
	unidade: z.string().min(1, "Unidade obrigatória"),
	quantidade: z.coerce
		.number()
		.pipe(z.number().positive("Quantidade deve ser positiva")),
	valorUnitario: z.coerce
		.number()
		.pipe(z.number().positive("Valor deve ser positivo")),
	cst: z.string().optional(),
	csosn: z.string().optional(),
	orig: z.number().default(0),
	cstPis: z.string().optional(),
	cstCofins: z.string().optional(),
	aliquotaPis: z.number().optional(),
	aliquotaCofins: z.number().optional(),
	baseIcms: z.number().min(0).optional(),
	aliquotaIcms: z.number().optional(),
	valorIcms: z.number().min(0).optional(),
	valorIpi: z.number().min(0).optional(),
	valorIpiDevol: z.number().min(0).optional(),
	baseIcmsSt: z.number().min(0).optional(),
	valorIcmsSt: z.number().min(0).optional(),
	valorFcpSt: z.number().min(0).optional(),
	valorFcpStRet: z.number().min(0).optional(),
	valorIcmsDesonerado: z.number().min(0).optional(),
	valorIcmsMonoRet: z.number().min(0).optional(),
	valorIcmsMonoReten: z.number().min(0).optional(),
});

export const totaisNfeSchema = z.object({
	frete: z.coerce.number().min(0).optional(),
	seguro: z.coerce.number().min(0).optional(),
	desconto: z.coerce.number().min(0).optional(),
	outrasDespesas: z.coerce.number().min(0).optional(),
});

export const pagamentoNfeSchema = z.object({
	formas: z.array(
		z.object({
			tPag: z.string().min(2),
			vPag: z.number().positive(),
			indPag: z.number().optional(),
		}),
	).min(1, "Informe ao menos uma forma de pagamento"),
});

export const transporteNfeSchema = z.object({
	modFrete: z.number().optional(),
});

export const documentoReferenciadoSchema = z
	.object({
		tipoDevolucao: z.enum(["compra", "venda"]).optional(),
		idnotafiscalReferenciada: z.string().uuid().optional(),
		chaveNfe: z.string().optional(),
		xml: z.string().optional(),
	})
	.optional();

export const formaPagamentoIntegracaoSchema = z.object({
	idtipodocumentofinanceiro: z.string().uuid(),
	valor: z.number().positive(),
	indPag: z.number().int().optional(),
});

export const emissaoNfeFormSchema = z.object({
	idempresa: z.string().uuid(),
	idnotafiscal: z.string().uuid().optional(),
	iddestinatario: z.string().uuid().optional(),
	idserienfe: z.string().uuid().optional(),
	confirmarProducao: z.boolean().default(false),
	natOp: z.string().max(60).optional(),
	itens: z.array(itemNfeSchema).min(1, "Informe ao menos um item"),
	totais: totaisNfeSchema.optional(),
	pagamento: pagamentoNfeSchema.optional(),
	transporte: transporteNfeSchema.optional(),
	informacoesAdicionais: z.string().max(2000).optional(),
	documentoReferenciado: documentoReferenciadoSchema,
	idplanocontas: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	idlocalestoque: z.string().uuid().optional(),
	idtipodocumento: z.string().uuid().optional(),
	formasPagamento: z.array(formaPagamentoIntegracaoSchema).optional(),
	gerarFinanceiro: z.boolean().optional().default(true),
	gerarEstoque: z.boolean().optional().default(true),
	iddav: z.string().uuid().optional(),
});

export type EmissaoNfeFormData = z.infer<typeof emissaoNfeFormSchema>;
export type ItemNfe = z.infer<typeof itemNfeSchema>;
export type TotaisNfe = z.infer<typeof totaisNfeSchema>;
export type PagamentoNfe = z.infer<typeof pagamentoNfeSchema>;
export type DocumentoReferenciadoNfe = z.infer<typeof documentoReferenciadoSchema>;
