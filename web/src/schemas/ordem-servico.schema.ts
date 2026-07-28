import { z } from "zod";
import {
	HEX_COR_REGEX,
	ORDEM_SERVICO_CAMPOS_EXTRA,
} from "@/constants/ordem-servico-status";

const uuidOpcional = z.string().uuid().nullable().optional();
const textoOpcional = z.string().nullable().optional();

const extrasFormSchema = Object.fromEntries(
	ORDEM_SERVICO_CAMPOS_EXTRA.map((campo) => [campo, textoOpcional]),
) as Record<(typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number], typeof textoOpcional>;

export const ordemServicoFormSchema = z.object({
	idcliente: uuidOpcional,
	nomecliente: z.string().max(60).nullable().optional(),
	cnpjcpfcliente: z.string().max(18).nullable().optional(),
	idobjeto: uuidOpcional,
	idarea: uuidOpcional,
	idtipoproblema: uuidOpcional,
	idatendente: uuidOpcional,
	idultimotecnico: uuidOpcional,
	idcondicaopagamento: uuidOpcional,
	idtipodocumentofinanceiro: uuidOpcional,
	problemadescrito: textoOpcional,
	laudotecnico: textoOpcional,
	observacao: textoOpcional,
	agendamento: textoOpcional,
	previsaoconclusao: textoOpcional,
	dataos: textoOpcional,
	orcamento: z.number().int().min(0).max(1).optional(),
	marca: z.string().max(30).nullable().optional(),
	modelo: z.string().max(30).nullable().optional(),
	placa: z.string().max(10).nullable().optional(),
	renavam: z.string().max(11).nullable().optional(),
	...extrasFormSchema,
});

export type OrdemServicoFormData = z.infer<typeof ordemServicoFormSchema>;

export const ordemServicoItemFormSchema = z.object({
	idproduto: z.string().uuid({ message: "Selecione um produto" }),
	quantidade: z
		.string()
		.min(1, "Informe a quantidade")
		.refine((v) => Number(v.replace(",", ".")) > 0, "Quantidade inválida"),
	preco: z
		.string()
		.min(1, "Informe o preço")
		.refine((v) => Number(v.replace(",", ".")) >= 0, "Preço inválido"),
	idtecnico: z.string().uuid().optional().or(z.literal("")),
	idcfop: z.string().uuid().optional().or(z.literal("")),
	unidademedida: z.string().max(6).optional().or(z.literal("")),
	observacao: z.string().optional().or(z.literal("")),
});

export type OrdemServicoItemFormData = z.infer<
	typeof ordemServicoItemFormSchema
>;

export const ordemServicoLoteFormSchema = z.object({
	codigolote: z.string().max(30).optional().or(z.literal("")),
	quantidade: z
		.string()
		.min(1, "Informe a quantidade")
		.refine((v) => Number(v.replace(",", ".")) > 0, "Quantidade inválida"),
	vencimento: z.string().optional().or(z.literal("")),
	datalote: z.string().optional().or(z.literal("")),
	emissao: z.string().optional().or(z.literal("")),
	idlote: z.string().optional().or(z.literal("")),
});

export type OrdemServicoLoteFormData = z.infer<
	typeof ordemServicoLoteFormSchema
>;

export const ordemServicoEventoFormSchema = z.object({
	idtipoevento: z.string().uuid({ message: "Selecione o status/evento" }),
	descricao: z.string().min(1, "Informe a descrição"),
	idtecnicode: z.string().uuid().optional().or(z.literal("")),
	idtecnicopara: z.string().uuid().optional().or(z.literal("")),
	nomecontato: z.string().max(50).optional().or(z.literal("")),
});

export type OrdemServicoEventoFormData = z.infer<
	typeof ordemServicoEventoFormSchema
>;

export const campoExtraConfigSchema = z.object({
	campo: z.enum(ORDEM_SERVICO_CAMPOS_EXTRA),
	nome: z.string().min(1).max(100),
	ativo: z.boolean(),
	obrigatorio: z.boolean(),
});

export const configuracaoOrdemServicoFormSchema = z.object({
	agrupafinanceiroaofaturar: z.number().int().min(0).max(1).optional(),
	descricao: z.string().max(100).nullable().optional(),
	descricaocampochave: z.string().max(50).nullable().optional(),
	mascaracampochave: z.string().max(30).nullable().optional(),
	mostrarcamposfinalizaritem: z.number().int().min(0).max(1).optional(),
	pedirprimeiroobjeto: z.number().int().min(0).max(1).optional(),
	tecnicoobrigatorio: z.number().int().min(0).max(1).optional(),
	usadadosveiculo: z.number().int().min(0).max(1).optional(),
	idcfopexternaproduto: uuidOpcional,
	idcfopexternaservico: uuidOpcional,
	idcfopexternaservicost: uuidOpcional,
	idcfopinternaproduto: uuidOpcional,
	idcfopinternaservico: uuidOpcional,
	idcfopinternaservicost: uuidOpcional,
	idmodelnfe: textoOpcional,
	idmodelonfse: textoOpcional,
	camposextras: z.array(campoExtraConfigSchema).max(16).optional(),
});

export type ConfiguracaoOrdemServicoFormData = z.infer<
	typeof configuracaoOrdemServicoFormSchema
>;

export const tipoEventoFormSchema = z.object({
	descricao: z.string().min(1).max(100),
	cor: z.string().regex(HEX_COR_REGEX, "Use o formato #RRGGBB"),
	ordem: z.number().int(),
	ativo: z.number().int().min(0).max(1),
});

export type TipoEventoFormData = z.infer<typeof tipoEventoFormSchema>;

export const gerarContasReceberFormSchema = z.object({
	formasPagamento: z
		.array(
			z.object({
				idtipodocumentofinanceiro: z.string().uuid(),
				valor: z.number().positive(),
			}),
		)
		.optional(),
});

export type GerarContasReceberFormData = z.infer<
	typeof gerarContasReceberFormSchema
>;
