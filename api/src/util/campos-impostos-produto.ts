import { z } from "zod";
import { normalizarCstPisCofins } from "@/util/montar-grupo-pis-cofins-item-nfe.js";

/**
 * Campos omitidos no JSON devem permanecer `undefined` (não gravar).
 * Só `null`/string vazia limpam o valor no banco.
 */
const campoCstIcmsOpcional = z
	.string()
	.max(3)
	.optional()
	.nullable()
	.transform((valor) => {
		if (valor === undefined) return undefined;
		const texto = valor?.trim();
		return texto ? texto : null;
	});

const campoTributacaoEcfOpcional = z
	.string()
	.max(7)
	.optional()
	.nullable()
	.transform((valor) => {
		if (valor === undefined) return undefined;
		const texto = valor?.trim();
		return texto ? texto : null;
	});

const campoCstPisCofinsOpcional = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((valor) => {
		if (valor === undefined) return undefined;
		if (valor === null || valor === "") {
			return null;
		}
		return normalizarCstPisCofins(valor) ?? null;
	});

export function parseNumeroDecimal(
	valor: string | number | null | undefined,
): number | null {
	if (valor === null || valor === undefined || valor === "") {
		return null;
	}

	if (typeof valor === "number") {
		return Number.isFinite(valor) ? valor : null;
	}

	const texto = String(valor).trim();
	if (!texto) {
		return null;
	}

	const normalizado = texto.includes(",")
		? texto.replace(/\./g, "").replace(",", ".")
		: texto;
	const numero = Number.parseFloat(normalizado);

	return Number.isFinite(numero) ? numero : null;
}

function campoPercentualOpcional(casas = 2, max = 999.99) {
	return z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			if (valor === null || valor === "") {
				return null;
			}

			const numero = parseNumeroDecimal(valor);

			if (numero === null || numero < 0 || numero > max) {
				return "__invalido__";
			}

			return numero.toFixed(casas);
		})
		.refine(
			(valor) => valor !== "__invalido__",
			"Percentual deve ser um número entre 0 e 999,99",
		)
		.transform((valor) => (valor === "__invalido__" ? null : valor));
}

export const camposAliquotaProdutoSchema = {
	aliquotaicmsinterna: campoPercentualOpcional(),
	aliquotaicmsdiferencialentrada: campoPercentualOpcional(),
	aliquotareducaoicmsnfcesat: campoPercentualOpcional(),
	aliquotafcpnf: campoPercentualOpcional(),
	ultimaaliquotaicmsst: campoPercentualOpcional(),
	ultimaaliquotafcpst: campoPercentualOpcional(),
	aliquotapis: campoPercentualOpcional(),
	aliquotacofins: campoPercentualOpcional(),
	aliquotapisentrada: campoPercentualOpcional(),
	aliquotaconfinsentrada: campoPercentualOpcional(),
	aliquotapisconfinsentradapreco: campoPercentualOpcional(),
	aliquotapisconfinssaidapreco: campoPercentualOpcional(),
	aliquotaiibs: campoPercentualOpcional(4),
	aliquotacbs: campoPercentualOpcional(4),
};

export const camposImpostosProdutoSchema = {
	idcfopentrada: z.string().optional().nullable(),
	idcfopsaida: z.string().optional().nullable(),
	idcfopsaidanfce: z.string().optional().nullable(),
	idcest: z.string().optional().nullable(),
	idtaxauf: z.string().optional().nullable(),
	situacaotributariasnentrada: campoCstIcmsOpcional,
	situacaotributaria: campoCstIcmsOpcional,
	situacaotributariasn: campoCstIcmsOpcional,
	tributacaoespecial: campoTributacaoEcfOpcional,
	tributacaosn: campoCstIcmsOpcional,
	cstpisentrada: campoCstPisCofinsOpcional,
	cstcofinsentrada: campoCstPisCofinsOpcional,
	cstpis: campoCstPisCofinsOpcional,
	cstcofins: campoCstPisCofinsOpcional,
	cstipientrada: z
		.string()
		.max(3)
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			const texto = valor?.trim();
			return texto ? texto : null;
		}),
	cstipisaida: z
		.string()
		.max(3)
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			const texto = valor?.trim();
			return texto ? texto : null;
		}),
	cstibs: z
		.string()
		.max(3)
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			const texto = valor?.trim();
			return texto ? texto : null;
		}),
	classtributariaibs: z
		.string()
		.max(6)
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === undefined) return undefined;
			const texto = valor?.trim();
			return texto ? texto : null;
		}),
	percentualmva: campoPercentualOpcional(),
	...camposAliquotaProdutoSchema,
};

export type CamposImpostosProduto = {
	idcfopentrada?: string | null | undefined;
	idcfopsaida?: string | null | undefined;
	idcfopsaidanfce?: string | null | undefined;
	idcest?: string | null | undefined;
	idtaxauf?: string | null | undefined;
	situacaotributariasnentrada?: string | null | undefined;
	situacaotributaria?: string | null | undefined;
	situacaotributariasn?: string | null | undefined;
	tributacaoespecial?: string | null | undefined;
	tributacaosn?: string | null | undefined;
	cstpisentrada?: string | null | undefined;
	cstcofinsentrada?: string | null | undefined;
	cstpis?: string | null | undefined;
	cstcofins?: string | null | undefined;
	cstipientrada?: string | null | undefined;
	cstipisaida?: string | null | undefined;
	cstibs?: string | null | undefined;
	classtributariaibs?: string | null | undefined;
	cfopvendaecf?: number | null | undefined;
	percentualmva?: string | null | undefined;
	aliquotaicmsinterna?: string | null | undefined;
	aliquotaicmsdiferencialentrada?: string | null | undefined;
	aliquotareducaoicmsnfcesat?: string | null | undefined;
	aliquotafcpnf?: string | null | undefined;
	ultimaaliquotaicmsst?: string | null | undefined;
	ultimaaliquotafcpst?: string | null | undefined;
	aliquotapis?: string | null | undefined;
	aliquotacofins?: string | null | undefined;
	aliquotapisentrada?: string | null | undefined;
	aliquotaconfinsentrada?: string | null | undefined;
	aliquotapisconfinsentradapreco?: string | null | undefined;
	aliquotapisconfinssaidapreco?: string | null | undefined;
	aliquotaiibs?: string | null | undefined;
	aliquotacbs?: string | null | undefined;
};

export function montarCamposImpostosProduto(
	dados: CamposImpostosProduto,
): CamposImpostosProduto {
	const chaves = Object.keys(
		camposImpostosProdutoSchema,
	) as (keyof CamposImpostosProduto)[];

	const resultado: CamposImpostosProduto = {};

	for (const chave of chaves) {
		if (!(chave in dados) || dados[chave] === undefined) {
			continue;
		}
		(resultado as Record<string, unknown>)[chave] = dados[chave] ?? null;
	}

	if ("cfopvendaecf" in dados && dados.cfopvendaecf !== undefined) {
		resultado.cfopvendaecf = dados.cfopvendaecf ?? null;
	}

	return resultado;
}
