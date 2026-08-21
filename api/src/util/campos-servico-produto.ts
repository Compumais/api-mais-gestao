import { z } from "zod";

const percentualOpcional = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.superRefine((valor, ctx) => {
		if (valor === null || valor === undefined || valor === "") return;
		const numero =
			typeof valor === "number"
				? valor
				: Number.parseFloat(String(valor).replace(",", "."));
		if (Number.isNaN(numero) || numero < 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Percentual deve ser um número não negativo",
			});
		}
	})
	.transform((valor) => {
		if (valor === undefined) return undefined;
		if (valor === null || valor === "") return null;
		const numero =
			typeof valor === "number"
				? valor
				: Number.parseFloat(String(valor).replace(",", "."));
		return numero.toFixed(2);
	});

const flag01 = z.number().int().min(0).max(1).optional().nullable();

export const camposServicoProdutoSchema = {
	itemrapido: flag01,
	podeserbrinde: flag01,
	inativo: flag01,
	nomeecf: z.string().max(120).optional().nullable(),
	decimaispreco: z.number().int().min(0).max(6).optional().nullable(),
	codigolistalc11603: z
		.string()
		.max(5)
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			const texto = valor?.replace(/\D/g, "").trim();
			return texto ? texto : null;
		}),
	codigotributacaonacional: z
		.string()
		.max(6)
		.optional()
		.nullable()
		.refine(
			(valor) => !valor || /^\d{6}$/.test(valor),
			"Código de tributação nacional deve ter 6 dígitos",
		),
	codigonbs: z
		.string()
		.max(9)
		.optional()
		.nullable()
		.refine(
			(valor) => !valor || /^\d{9}$/.test(valor),
			"Código NBS deve ter 9 dígitos",
		),
	cicloposvenda: z.number().int().min(0).optional().nullable(),
	idplanocontas: z.string().uuid().optional().nullable(),
	comissao: percentualOpcional,
	comissaoavista: percentualOpcional,
	comissaoprazo: percentualOpcional,
	percentualcomissaoquitacao: percentualOpcional,
	situacaoiss: z.string().max(7).optional().nullable(),
	aliquotaiss: percentualOpcional,
	exigibilidadeiss: z.string().max(1).optional().nullable(),
	processoisencaoiss: z.string().max(60).optional().nullable(),
	incentivofiscal: flag01,
	codigomunicipalservico: z.string().max(20).optional().nullable(),
	tipoimpressaogourmet: z.string().max(40).optional().nullable(),
	idcfopsaidaexterna: z.string().uuid().optional().nullable(),
	aliquotapis: percentualOpcional,
	aliquotacofins: percentualOpcional,
};

export type CamposServicoProduto = {
	itemrapido?: number | null | undefined;
	podeserbrinde?: number | null | undefined;
	inativo?: number | null | undefined;
	nomeecf?: string | null | undefined;
	decimaispreco?: number | null | undefined;
	codigolistalc11603?: string | null | undefined;
	codigotributacaonacional?: string | null | undefined;
	codigonbs?: string | null | undefined;
	cicloposvenda?: number | null | undefined;
	idplanocontas?: string | null | undefined;
	comissao?: string | null | undefined;
	comissaoavista?: string | null | undefined;
	comissaoprazo?: string | null | undefined;
	percentualcomissaoquitacao?: string | null | undefined;
	situacaoiss?: string | null | undefined;
	aliquotaiss?: string | null | undefined;
	exigibilidadeiss?: string | null | undefined;
	processoisencaoiss?: string | null | undefined;
	incentivofiscal?: number | null | undefined;
	codigomunicipalservico?: string | null | undefined;
	tipoimpressaogourmet?: string | null | undefined;
	idcfopsaidaexterna?: string | null | undefined;
	aliquotapis?: string | null | undefined;
	aliquotacofins?: string | null | undefined;
};

export function montarCamposServicoProduto(
	dados: CamposServicoProduto,
): CamposServicoProduto {
	return {
		itemrapido: dados.itemrapido ?? null,
		podeserbrinde: dados.podeserbrinde ?? null,
		inativo: dados.inativo ?? null,
		nomeecf: dados.nomeecf?.trim() || null,
		decimaispreco: dados.decimaispreco ?? null,
		codigolistalc11603: dados.codigolistalc11603 ?? null,
		codigotributacaonacional: dados.codigotributacaonacional ?? null,
		codigonbs: dados.codigonbs ?? null,
		cicloposvenda: dados.cicloposvenda ?? null,
		idplanocontas: dados.idplanocontas ?? null,
		comissao: dados.comissao ?? null,
		comissaoavista: dados.comissaoavista ?? null,
		comissaoprazo: dados.comissaoprazo ?? null,
		percentualcomissaoquitacao: dados.percentualcomissaoquitacao ?? null,
		situacaoiss: dados.situacaoiss?.trim() || null,
		aliquotaiss: dados.aliquotaiss ?? null,
		exigibilidadeiss: dados.exigibilidadeiss?.trim() || null,
		processoisencaoiss: dados.processoisencaoiss?.trim() || null,
		incentivofiscal: dados.incentivofiscal ?? null,
		codigomunicipalservico: dados.codigomunicipalservico?.trim() || null,
		tipoimpressaogourmet: dados.tipoimpressaogourmet?.trim() || null,
		idcfopsaidaexterna: dados.idcfopsaidaexterna ?? null,
		aliquotapis: dados.aliquotapis ?? null,
		aliquotacofins: dados.aliquotacofins ?? null,
	};
}
