import { z } from "zod";
import { TIPOS_PRODUTO_SPED } from "@/constants/tipo-produto";

const codigosTipoProduto = TIPOS_PRODUTO_SPED.map((item) => item.codigo) as [
	string,
	...string[],
];

const idOpcional = z.string().uuid("ID inválido").nullable().optional();

export const cfopFormSchema = z.object({
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(20, "Código deve ter no máximo 20 caracteres"),
	descricao: z
		.string()
		.min(1, "Descrição é obrigatória")
		.max(1024, "Descrição deve ter no máximo 1024 caracteres"),
	tipoproduto: z
		.enum(codigosTipoProduto, {
			message: "Tipo de produto inválido",
		})
		.nullable()
		.optional(),
	ativo: z.boolean(),
	consideravenda: z.boolean(),
	considerarservico: z.boolean(),
	digitarimpostositemnotasaida: z.boolean(),
	calcularimpostoaproximado: z.boolean(),
	possuiincentivosfiscais: z.boolean(),
	consideracustomedio: z.boolean(),
	informartotaismanualmente: z.boolean(),
	permitenotasemvalor: z.boolean(),
	consumidorfinal: z.boolean(),
	permitirbaixarlotevencido: z.boolean(),
	naobaixarestoque: z.boolean(),
	digitartotalitemmanualmente: z.boolean(),
	considerainscricaoestadualsub: z.boolean(),
	exigirdocumentoreferenciado: z.boolean(),
	registrarproducaovenda: z.boolean(),
	considerarproduto: z.boolean(),
	naoconsiderapiscofinsproduto: z.boolean(),
	naoconsiderarvlnotafiscalitem: z.boolean(),
	utilizartodasoperacoes: z.boolean(),
	interestadualdestmesmauf: z.boolean(),
	tipoConsignacao: z.enum(["nenhuma", "entrada", "saida"]),
	presencaconsumidor: z
		.union([
			z.literal(0),
			z.literal(1),
			z.literal(2),
			z.literal(3),
			z.literal(5),
			z.literal(9),
			z.null(),
		])
		.optional(),
	finalidadeemissaonfe: z
		.union([
			z.literal(1),
			z.literal(2),
			z.literal(3),
			z.literal(4),
			z.literal(5),
			z.literal(6),
			z.literal(7),
			z.literal(8),
			z.literal(9),
			z.null(),
		])
		.optional(),
	tipovalorpreco: z
		.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.null()])
		.optional(),
	integracao: z
		.union([z.literal(0), z.literal(1), z.literal(2), z.null()])
		.optional(),
	idplanocontas: idOpcional,
	idtipodocumentofinanceiro: idOpcional,
	idnaturezaoperacaoinversa: idOpcional,
	idnaturezanaocontribuinte: idOpcional,
	idnaturezadevolucao: idOpcional,
});

export type CfopFormData = z.infer<typeof cfopFormSchema>;

export const cfopFormDefaultValues: CfopFormData = {
	codigo: "",
	descricao: "",
	tipoproduto: null,
	ativo: true,
	consideravenda: false,
	considerarservico: false,
	digitarimpostositemnotasaida: false,
	calcularimpostoaproximado: false,
	possuiincentivosfiscais: false,
	consideracustomedio: false,
	informartotaismanualmente: false,
	permitenotasemvalor: false,
	consumidorfinal: false,
	permitirbaixarlotevencido: false,
	naobaixarestoque: false,
	digitartotalitemmanualmente: false,
	considerainscricaoestadualsub: false,
	exigirdocumentoreferenciado: false,
	registrarproducaovenda: false,
	considerarproduto: false,
	naoconsiderapiscofinsproduto: false,
	naoconsiderarvlnotafiscalitem: false,
	utilizartodasoperacoes: false,
	interestadualdestmesmauf: false,
	tipoConsignacao: "nenhuma",
	presencaconsumidor: null,
	finalidadeemissaonfe: null,
	tipovalorpreco: null,
	integracao: null,
	idplanocontas: null,
	idtipodocumentofinanceiro: null,
	idnaturezaoperacaoinversa: null,
	idnaturezanaocontribuinte: null,
	idnaturezadevolucao: null,
};
