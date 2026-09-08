import z from "zod";

const flag01 = z
	.union([z.literal(0), z.literal(1), z.literal("0"), z.literal("1")])
	.nullable()
	.optional()
	.transform((valor) => {
		if (valor === undefined) return undefined;
		if (valor === null) return null;
		return Number(valor) as 0 | 1;
	});

const idOpcional = z
	.union([z.string().uuid(), z.literal("")])
	.nullable()
	.optional()
	.transform((valor) => {
		if (valor === undefined) return undefined;
		if (valor === null || valor === "") return null;
		return valor;
	});

function enumNumericoOpcional<T extends readonly number[]>(
	valores: T,
	mensagem: string,
) {
	return z
		.union([z.number(), z.string(), z.null()])
		.optional()
		.transform((valor, ctx) => {
			if (valor === undefined) return undefined;
			if (valor === null || valor === "") return null;
			const numero = typeof valor === "number" ? valor : Number(valor);
			if (
				!Number.isInteger(numero) ||
				!(valores as readonly number[]).includes(numero)
			) {
				ctx.addIssue({ code: "custom", message: mensagem });
				return z.NEVER;
			}
			return numero as T[number];
		});
}

export const PRESENCA_CONSUMIDOR_CFOP = [0, 1, 2, 3, 5, 9] as const;
export const FINALIDADE_EMISSAO_NFE_CFOP = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const TIPO_VALOR_PRECO_CFOP = [0, 1, 2, 3] as const;
export const INTEGRACAO_FINANCEIRO_CFOP = [0, 1, 2] as const;

/** Serializa flag textual legada (varchar) a partir de 0/1 ou booleano. */
export function serializarNaoConsiderarValorItem(
	valor: string | number | boolean | null | undefined,
): string | null | undefined {
	if (valor === undefined) return undefined;
	if (valor === null) return null;
	if (typeof valor === "boolean") return valor ? "1" : "0";
	if (typeof valor === "number") return valor === 1 ? "1" : "0";
	const normalizado = valor.trim();
	if (normalizado === "") return null;
	if (normalizado === "1" || normalizado.toLowerCase() === "true") return "1";
	if (normalizado === "0" || normalizado.toLowerCase() === "false") return "0";
	return normalizado.slice(0, 3);
}

export const cfopCamposGeraisSchema = z.object({
	codigo: z.string().max(20).optional(),
	descricao: z.string().max(1024).optional(),
	tipoproduto: z.string().max(2).nullable().optional(),
	inativa: flag01,
	consideravenda: flag01,
	considerarservico: flag01,
	digitarimpostositemnotasaida: flag01,
	calcularimpostoaproximado: flag01,
	possuiincentivosfiscais: flag01,
	consideracustomedio: flag01,
	informartotaismanualmente: flag01,
	permitenotasemvalor: flag01,
	consumidorfinal: flag01,
	permitirbaixarlotevencido: flag01,
	naobaixarestoque: flag01,
	digitartotalitemmanualmente: flag01,
	considerainscricaoestadualsub: flag01,
	exigirdocumentoreferenciado: flag01,
	registrarproducaovenda: flag01,
	considerarproduto: flag01,
	naoconsiderapiscofinsproduto: flag01,
	utilizartodasoperacoes: flag01,
	interestadualdestmesmauf: flag01,
	naoconsiderarvlnotafiscalitem: z
		.union([
			z.string().max(3),
			z.literal(0),
			z.literal(1),
			z.boolean(),
			z.null(),
		])
		.optional()
		.transform((valor) => serializarNaoConsiderarValorItem(valor)),
	consignacao: flag01,
	consignacaoentrada: flag01,
	presencaconsumidor: enumNumericoOpcional(
		PRESENCA_CONSUMIDOR_CFOP,
		"Presença do consumidor inválida",
	),
	finalidadeemissaonfe: enumNumericoOpcional(
		FINALIDADE_EMISSAO_NFE_CFOP,
		"Finalidade de emissão inválida",
	),
	tipovalorpreco: enumNumericoOpcional(
		TIPO_VALOR_PRECO_CFOP,
		"Tipo de preço inválido",
	),
	integracao: enumNumericoOpcional(
		INTEGRACAO_FINANCEIRO_CFOP,
		"Integração financeira inválida",
	),
	idplanocontas: idOpcional,
	idtipodocumentofinanceiro: idOpcional,
	idnaturezaoperacaoinversa: idOpcional,
	idnaturezanaocontribuinte: idOpcional,
	idnaturezadevolucao: idOpcional,
});

export const criarCfopBodySchema = cfopCamposGeraisSchema.extend({
	idempresa: z.string().uuid(),
	codigo: z.string().min(1).max(20),
	descricao: z.string().min(1).max(1024),
});

export const atualizarCfopBodySchema = cfopCamposGeraisSchema;

export type CriarCfopBody = z.infer<typeof criarCfopBodySchema>;
export type AtualizarCfopBody = z.infer<typeof atualizarCfopBodySchema>;
