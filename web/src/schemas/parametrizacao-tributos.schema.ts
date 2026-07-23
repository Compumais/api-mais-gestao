import { z } from "zod";

const campoNumericoOpcional = z
	.string()
	.optional()
	.nullable()
	.refine(
		(valor) => {
			if (!valor || valor.trim() === "") return true;
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero >= 0;
		},
		{ message: "Informe um valor numérico válido" },
	);

const campoCstOpcional = (tamanho: number, label: string) =>
	z
		.string()
		.max(tamanho, `${label} deve ter no máximo ${tamanho} caracteres`)
		.optional()
		.nullable();

export const parametrizacaoTributosFormSchema = z.object({
	codigocfopentrada: z
		.string()
		.min(1, "CFOP de entrada é obrigatório")
		.max(10, "CFOP deve ter no máximo 10 caracteres"),
	cstentrada: campoCstOpcional(3, "CST entrada"),
	csosnentrada: campoCstOpcional(3, "CSOSN entrada"),
	ncm: z
		.string()
		.max(10, "NCM deve ter no máximo 10 caracteres")
		.optional()
		.nullable(),
	taxaicmsentrada: campoNumericoOpcional,
	uf: z
		.string()
		.max(2, "UF deve ter no máximo 2 caracteres")
		.optional()
		.nullable(),
	ignorarprimeirodigitocst: z.boolean().optional(),
	idcfopsaidanfe: z.string().optional().nullable(),
	cstnfe: campoCstOpcional(3, "CST NFe"),
	csosnnfe: campoCstOpcional(3, "CSOSN NFe"),
	taxaicmsnfe: campoNumericoOpcional,
	idcfopsaidanfce: z.string().optional().nullable(),
	cstnfce: campoCstOpcional(7, "CST NFC-e"),
	csosnnfce: campoCstOpcional(3, "CSOSN NFC-e"),
	taxaicmsnfce: campoNumericoOpcional,
	aliquotapis: campoNumericoOpcional,
	cstpis: campoCstOpcional(2, "CST PIS"),
	aliquotacofins: campoNumericoOpcional,
	cstcofins: campoCstOpcional(2, "CST COFINS"),
	cstipi: campoCstOpcional(2, "CST IPI"),
	idenquadramentoipi: z.string().optional().nullable(),
	percentualmva: campoNumericoOpcional,
	percentualirrf: campoNumericoOpcional,
	tipoproduto: campoCstOpcional(2, "Tipo de produto"),
});

export type ParametrizacaoTributosFormData = z.infer<
	typeof parametrizacaoTributosFormSchema
>;
