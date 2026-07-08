import z from "zod";
import { isIndPresNfeValido } from "@/constants/ind-pres-nfe.js";

const itemNfeSchema = z.object({
	idproduto: z.string().uuid().optional(),
	codigoProduto: z.string().optional(),
	ean: z.string().optional(),
	eanTributavel: z.string().optional(),
	descricao: z.string().min(1),
	ncm: z.string().min(1),
	cfop: z.string().min(4).max(5),
	unidade: z.string().min(1).max(6),
	quantidade: z.number().positive(),
	valorUnitario: z.number().positive(),
	cst: z.string().optional(),
	csosn: z.string().optional(),
	orig: z.number().default(0),
	cstPis: z.string().optional(),
	cstCofins: z.string().optional(),
	aliquotaPis: z.number().optional(),
	aliquotaCofins: z.number().optional(),
	baseIcms: z.number().min(0).optional(),
	aliquotaIcms: z.number().optional(),
	pCredSN: z.number().optional(),
	vCredICMSSN: z.number().min(0).optional(),
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

const documentoReferenciadoSchema = z
	.object({
		tipoDevolucao: z.enum(["compra", "venda"]).optional(),
		idnotafiscalReferenciada: z.string().uuid().optional(),
		chaveNfe: z.string().optional(),
		xml: z.string().optional(),
	})
	.optional();

const indPresNfeSchema = z
	.number()
	.int()
	.refine((valor) => isIndPresNfeValido(valor), "indPres inválido")
	.optional();

export const emitirNfeBodySchema = z.object({
	idempresa: z.string().uuid(),
	idnotafiscal: z.string().uuid().optional(),
	iddestinatario: z.string().uuid().optional(),
	idserienfe: z.string().uuid().optional(),
	confirmarProducao: z.boolean().default(false),
	natOp: z.string().max(60).optional(),
	indPres: indPresNfeSchema,
	itens: z.array(itemNfeSchema).min(1),
	totais: z
		.object({
			frete: z.number().optional(),
			seguro: z.number().optional(),
			desconto: z.number().optional(),
			outrasDespesas: z.number().optional(),
		})
		.optional(),
	pagamento: z
		.object({
			formas: z.array(
				z.object({
					tPag: z.string(),
					vPag: z.number(),
					indPag: z.number().optional(),
				}),
			),
		})
		.optional(),
	transporte: z.object({ modFrete: z.number().optional() }).optional(),
	informacoesAdicionais: z.string().max(2000).optional(),
	documentoReferenciado: documentoReferenciadoSchema,
	idplanocontas: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	idlocalestoque: z.string().uuid().optional(),
	idtipodocumento: z.string().uuid().optional(),
	iddav: z.string().uuid().optional(),
	formasPagamento: z
		.array(
			z.object({
				idtipodocumentofinanceiro: z.string().uuid(),
				valor: z.number().positive(),
				indPag: z.number().int().optional(),
			}),
		)
		.optional(),
	gerarFinanceiro: z.boolean().optional().default(true),
	gerarEstoque: z.boolean().optional().default(true),
});

export type EmitirNfeBody = z.infer<typeof emitirNfeBodySchema>;
