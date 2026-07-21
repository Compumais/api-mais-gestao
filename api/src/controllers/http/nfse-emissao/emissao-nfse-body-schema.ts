import z from "zod";

const enderecoSchema = z
	.object({
		logradouro: z.string().optional(),
		numero: z.string().optional(),
		complemento: z.string().optional(),
		bairro: z.string().optional(),
		codigoMunicipioIbge: z.string().optional(),
		uf: z.string().optional(),
		cep: z.string().optional(),
	})
	.optional();

const valoresServicoSchema = z.object({
	servicos: z.number().nonnegative(),
	deducoes: z.number().nonnegative().optional(),
	pis: z.number().nonnegative().optional(),
	cofins: z.number().nonnegative().optional(),
	inss: z.number().nonnegative().optional(),
	ir: z.number().nonnegative().optional(),
	csll: z.number().nonnegative().optional(),
	outrasRetencoes: z.number().nonnegative().optional(),
	iss: z.number().nonnegative().optional(),
	aliquota: z.number().nonnegative().optional(),
	descontoIncondicionado: z.number().nonnegative().optional(),
	descontoCondicionado: z.number().nonnegative().optional(),
});

export const emitirNfseBodySchema = z.object({
	idempresa: z.string().uuid(),
	iddestinatario: z.string().uuid().optional(),
	idnfseserie: z.string().uuid().optional(),
	confirmarProducao: z.boolean().optional(),
	tomador: z
		.object({
			cnpjCpf: z.string().optional(),
			razaoSocial: z.string().optional(),
			email: z.string().optional(),
			telefone: z.string().optional(),
			endereco: enderecoSchema,
		})
		.optional(),
	servico: z.object({
		itemListaServico: z.string().min(1),
		discriminacao: z.string().min(1),
		codigoCnae: z.string().optional(),
		codigoTributacaoMunicipio: z.string().optional(),
		codigoTributacaoNacional: z
			.string()
			.regex(/^\d{6}$/, "cTribNac deve ter 6 dígitos")
			.optional(),
		codigoNbs: z
			.string()
			.regex(/^\d{9}$/, "cNBS deve ter 9 dígitos")
			.optional(),
		codigoMunicipioIncidencia: z.string().optional(),
		exigibilidadeIss: z.string().optional(),
		issRetido: z.string().optional(),
		valores: valoresServicoSchema,
		ibsCbs: z
			.object({
				finNFSe: z.number().int().optional(),
				indFinal: z.number().int().optional(),
				cIndOp: z.string().optional(),
				tpOper: z.number().int().optional(),
				indDest: z.number().int().optional(),
				cst: z.string().optional(),
				cClassTrib: z.string().optional(),
			})
			.optional(),
	}),
	itens: z
		.array(
			z.object({
				descricao: z.string().min(1),
				quantidade: z.number().positive(),
				valorUnitario: z.number().nonnegative(),
				codigoListaLc11603: z.string().optional(),
			}),
		)
		.optional(),
	competencia: z.string().optional(),
	dataEmissao: z.string().optional(),
	informacoesAdicionais: z.string().optional(),
	idordemservico: z.string().uuid().optional(),
	idplanocontas: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	idtipodocumento: z.string().uuid().optional(),
	formasPagamento: z
		.array(
			z.object({
				idtipodocumentofinanceiro: z.string().uuid(),
				valor: z.number().positive(),
				indPag: z.number().optional(),
			}),
		)
		.optional(),
	gerarFinanceiro: z.boolean().optional(),
});
