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

const campoTributacaoEcfOpcional = z
	.string()
	.max(7)
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
	cfopvendaecf?: number | null | undefined;
};

export function montarCamposImpostosProduto(
	dados: CamposImpostosProduto,
): CamposImpostosProduto {
	return {
		idcfopentrada: dados.idcfopentrada ?? null,
		idcfopsaida: dados.idcfopsaida ?? null,
		idcfopsaidanfce: dados.idcfopsaidanfce ?? null,
		idcest: dados.idcest ?? null,
		idtaxauf: dados.idtaxauf ?? null,
		situacaotributariasnentrada: dados.situacaotributariasnentrada ?? null,
		situacaotributaria: dados.situacaotributaria ?? null,
		situacaotributariasn: dados.situacaotributariasn ?? null,
		tributacaoespecial: dados.tributacaoespecial ?? null,
		tributacaosn: dados.tributacaosn ?? null,
		cstpisentrada: dados.cstpisentrada ?? null,
		cstcofinsentrada: dados.cstcofinsentrada ?? null,
		cstpis: dados.cstpis ?? null,
		cstcofins: dados.cstcofins ?? null,
		cfopvendaecf: dados.cfopvendaecf ?? null,
	};
}
