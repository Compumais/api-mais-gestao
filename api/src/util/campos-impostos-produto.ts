import { z } from "zod";

const campoCstIcmsOpcional = z
	.string()
	.max(3)
	.optional()
	.nullable()
	.transform((valor) => {
		const texto = valor?.trim();
		return texto ? texto : null;
	});

const campoCstPisCofinsOpcional = z
	.string()
	.max(2)
	.optional()
	.nullable()
	.transform((valor) => {
		const texto = valor?.trim();
		return texto ? texto : null;
	});

export const camposImpostosProdutoSchema = {
	idcfopentrada: z.string().optional().nullable(),
	idcfopsaida: z.string().optional().nullable(),
	idcest: z.string().optional().nullable(),
	situacaotributariasnentrada: campoCstIcmsOpcional,
	situacaotributariasn: campoCstIcmsOpcional,
	cstpisentrada: campoCstPisCofinsOpcional,
	cstcofinsentrada: campoCstPisCofinsOpcional,
	cstpis: campoCstPisCofinsOpcional,
	cstcofins: campoCstPisCofinsOpcional,
};

export type CamposImpostosProduto = {
	idcfopentrada?: string | null | undefined;
	idcfopsaida?: string | null | undefined;
	idcest?: string | null | undefined;
	situacaotributariasnentrada?: string | null | undefined;
	situacaotributariasn?: string | null | undefined;
	cstpisentrada?: string | null | undefined;
	cstcofinsentrada?: string | null | undefined;
	cstpis?: string | null | undefined;
	cstcofins?: string | null | undefined;
};

export function montarCamposImpostosProduto(
	dados: CamposImpostosProduto,
): CamposImpostosProduto {
	return {
		idcfopentrada: dados.idcfopentrada ?? null,
		idcfopsaida: dados.idcfopsaida ?? null,
		idcest: dados.idcest ?? null,
		situacaotributariasnentrada: dados.situacaotributariasnentrada ?? null,
		situacaotributariasn: dados.situacaotributariasn ?? null,
		cstpisentrada: dados.cstpisentrada ?? null,
		cstcofinsentrada: dados.cstcofinsentrada ?? null,
		cstpis: dados.cstpis ?? null,
		cstcofins: dados.cstcofins ?? null,
	};
}
