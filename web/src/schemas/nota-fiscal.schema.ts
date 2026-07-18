import { z } from "zod";

export const itemNotaFiscalSchema = z.object({
	idproduto: z.string().optional(),
	codigoproduto: z.string().optional(),
	ean: z.string().optional(),
	descricaoproduto: z.string().min(1, "Informe a descrição do produto"),
	quantidade: z.string().min(1, "Informe a quantidade"),
	precounitario: z.string().min(1, "Informe o preço unitário"),
	total: z.string().optional(),
	cfop: z.string().optional(),
	ncm: z.string().optional(),
	unidade: z.string().optional(),
});

export const notaFiscalManualSchema = z.object({
	identidade: z.string().optional(),
	numero: z.string().optional(),
	serie: z.string().optional(),
	modelo: z.string().optional(),
	chavenfe: z.string().optional(),
	emissao: z.string().optional(),
	entradasaida: z.string().optional(),
	idplanocontas: z.string().optional(),
	idcondicaopagto: z.string().optional(),
	idtipodocumento: z.string().optional(),
	valortotalnota: z.string().optional(),
	observacao: z.string().optional(),
	gerarCustos: z.boolean(),
	gerarFinanceiro: z.boolean(),
	itens: z.array(itemNotaFiscalSchema).min(1, "Informe ao menos um item"),
});

export type NotaFiscalManualFormData = z.infer<typeof notaFiscalManualSchema>;
export type ItemNotaFiscalFormData = z.infer<typeof itemNotaFiscalSchema>;

export const itemNotaFiscalEdicaoSchema = z.object({
	id: z.string().uuid(),
	descricao: z.string().min(1, "Informe a descrição"),
	quantidade: z.string().min(1, "Informe a quantidade"),
	precounitario: z.string().min(1, "Informe o preço unitário"),
	total: z.string().optional(),
	cfop: z.string().optional(),
	ncm: z.string().optional(),
	unidade: z.string().optional(),
});

export const notaFiscalCompraEdicaoSchema = z.object({
	identidade: z.string().optional().nullable(),
	numero: z.string().optional().nullable(),
	serie: z.string().optional().nullable(),
	modelo: z.string().optional().nullable(),
	chavenfe: z.string().optional().nullable(),
	emissao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().optional().nullable(),
	valortotalnota: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
	itens: z.array(itemNotaFiscalEdicaoSchema).min(1),
});

export type NotaFiscalCompraEdicaoFormData = z.infer<
	typeof notaFiscalCompraEdicaoSchema
>;

export const importarXmlNfSchema = z.object({
	idplanocontas: z.string().optional(),
	idcondicaopagto: z.string().optional(),
	idtipodocumento: z.string().optional(),
	gerarCustos: z.boolean(),
	gerarFinanceiro: z.boolean(),
});

export type ImportarXmlNfFormData = z.infer<typeof importarXmlNfSchema>;

export const importarChaveNfSchema = z.object({
	chaveNfe: z
		.string()
		.min(1, "Informe a chave NF-e")
		.transform((valor) => valor.replace(/\D/g, ""))
		.refine((valor) => valor.length === 44, {
			message: "A chave NF-e deve conter 44 dígitos",
		}),
	idplanocontas: z.string().optional(),
	idcondicaopagto: z.string().optional(),
	idtipodocumento: z.string().optional(),
});

export type ImportarChaveNfFormData = z.infer<typeof importarChaveNfSchema>;

export const finalizarRascunhoSchema = z.object({
	gerarCustos: z.boolean(),
	gerarFinanceiro: z.boolean(),
	idcondicaopagto: z.string().optional(),
	idplanocontas: z.string().optional(),
	idtipodocumento: z.string().optional(),
});

export type FinalizarRascunhoFormData = z.infer<typeof finalizarRascunhoSchema>;

export const itemImportacaoSchema = z.object({
	descricaoFornecedor: z
		.string()
		.min(1, "Informe o nome do produto")
		.max(120, "Nome do produto deve ter no máximo 120 caracteres"),
	fatorConversao: z
		.string()
		.min(1, "Informe o fator de conversão")
		.refine((valor) => {
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero > 0;
		}, "Fator de conversão deve ser maior que zero"),
	quantidadeEstoque: z.string(),
	precounitarioEstoque: z.string(),
	precoVenda: z.string().optional(),
	idcfop: z.string().optional(),
	cfopXml: z.string().optional(),
	ncmXml: z.string().optional(),
	idncm: z.string().optional(),
	eanXml: z.string().optional(),
	idgrupo: z.string().optional(),
	idunidademedida: z.string().optional(),
	tipoproduto: z.string().optional().nullable(),
	unidadeEstoque: z.string().optional(),
	origem: z.string().optional(),
	situacaotributaria: z.string().optional(),
	baseicms: z.string().optional(),
	percentualicms: z.string().optional(),
	valoricms: z.string().optional(),
	cstpis: z.string().optional(),
	aliquotapis: z.string().optional(),
	valorpis: z.string().optional(),
	cstcofins: z.string().optional(),
	aliquotacofins: z.string().optional(),
	valorcofins: z.string().optional(),
	ipi: z.string().optional(),
});

export type ItemImportacaoFormData = z.infer<typeof itemImportacaoSchema>;
