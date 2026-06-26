import { z } from "zod";

function numeroInteiroOpcional() {
	return z.preprocess((valor) => {
		if (valor === "" || valor === null || valor === undefined) return null;
		if (typeof valor === "number" && Number.isNaN(valor)) return null;
		return valor;
	}, z.number().int().optional().nullable());
}

export const produtoFormSchema = z.object({
	codigo: z
		.number({ message: "Código é obrigatório" })
		.int("Código deve ser um número inteiro")
		.positive("Código deve ser maior que zero"),
	ean: z
		.number()
		.int("Código de barras deve ser um número inteiro")
		.optional()
		.nullable(),
	referencia: z
		.string()
		.max(60, "Referência deve ter no máximo 60 caracteres")
		.optional()
		.nullable(),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.max(120, "Nome deve ter no máximo 120 caracteres"),
	idunidademedida: z.string().min(1, "Unidade é obrigatória"),
	fornecedor: z.string().optional().nullable(),
	idgrupo: z.string().min(1, "Grupo é obrigatório"),
	preco: z
		.string()
		.min(1, "Preço é obrigatório")
		.refine((valor) => {
			const numero = Number.parseFloat(valor);
			return !Number.isNaN(numero) && numero > 0;
		}, "Preço deve ser maior que zero"),
	custoaquisicao: z
		.string()
		.optional()
		.nullable()
		.refine((valor) => {
			if (!valor || valor.trim() === "") return true;
			const numero = Number.parseFloat(valor);
			return !Number.isNaN(numero) && numero >= 0;
		}, "Preço de custo inválido"),
	tipo: z.enum(["P", "S"], { message: "Tipo de produto inválido" }),
	iat: z.enum(["A", "T"]).optional().nullable(),
	ippt: z.enum(["P", "T"], { message: "IPPT é obrigatório" }),
	origem: z
		.number()
		.int()
		.min(0, "Origem inválida")
		.max(8, "Origem inválida"),
	ncm: z
		.string()
		.min(1, "NCM é obrigatório")
		.max(10, "NCM deve ter no máximo 10 caracteres"),
	idcfopentrada: z.string().optional().nullable(),
	idcfopsaida: z.string().optional().nullable(),
	idcfopsaidanfce: z.string().optional().nullable(),
	idcest: z.string().optional().nullable(),
	idtaxauf: z.string().optional().nullable(),
	situacaotributariasnentrada: z
		.string()
		.max(3, "CST deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	situacaotributaria: z
		.string()
		.max(3, "CST deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	situacaotributariasn: z
		.string()
		.max(3, "CSOSN deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	tributacaoespecial: z
		.string()
		.max(7, "CST deve ter no máximo 7 caracteres")
		.optional()
		.nullable(),
	tributacaosn: z
		.string()
		.max(3, "CSOSN deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	cstpisentrada: z
		.string()
		.max(2, "CST deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
	cstcofinsentrada: z
		.string()
		.max(2, "CST deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
	cstpis: z
		.string()
		.max(2, "CST deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
	cstcofins: z
		.string()
		.max(2, "CST deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
	cstipientrada: z
		.string()
		.max(3, "CST IPI deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	cstipisaida: z
		.string()
		.max(3, "CST IPI deve ter no máximo 3 caracteres")
		.optional()
		.nullable(),
	observacoes: z.string().optional().nullable(),
	enviamobile: z.boolean().optional(),
	quantidadepadrao: numeroInteiroOpcional().refine(
		(valor) => valor === null || valor === undefined || valor >= 0,
		"Saldo em estoque não pode ser negativo",
	),
	quantidademinima: numeroInteiroOpcional().refine(
		(valor) => valor === null || valor === undefined || valor >= 0,
		"Quantidade mínima não pode ser negativa",
	),
	quantidademaxima: numeroInteiroOpcional().refine(
		(valor) => valor === null || valor === undefined || valor > 0,
		"Quantidade máxima deve ser maior que zero",
	),
});

export type ProdutoFormData = z.infer<typeof produtoFormSchema>;
