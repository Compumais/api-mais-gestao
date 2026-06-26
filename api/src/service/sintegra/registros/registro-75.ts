import {
	formatarAlfanumerico,
	formatarCodigoProduto,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarNumerico,
	montarLinha,
} from "../formatador-campo.js";
import type { ProdutoSintegra } from "../tipos-sintegra.js";

type MontarRegistro75Parametros = {
	produto: ProdutoSintegra;
	dataInicio: string;
	dataFim: string;
};

export function montarRegistro75({
	produto,
	dataInicio,
	dataFim,
}: MontarRegistro75Parametros): string {
	return montarLinha([
		"75",
		formatarDataAaaammdd(dataInicio),
		formatarDataAaaammdd(dataFim),
		formatarCodigoProduto(produto.codigo),
		formatarNumerico(produto.ncm, 8),
		formatarAlfanumerico(produto.descricao, 53),
		formatarAlfanumerico(produto.unidade, 6),
		formatarDecimal(produto.aliquotaIpi, 5, 2),
		formatarDecimal(produto.aliquotaIcms, 4, 2),
		formatarDecimal(produto.reducaoBaseIcms, 5, 2),
		formatarDecimal(produto.baseIcmsSt, 13, 2),
	]);
}
