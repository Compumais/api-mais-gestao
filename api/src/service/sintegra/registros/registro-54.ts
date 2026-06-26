import {
	formatarCfop,
	formatarCnpjCpf,
	formatarCodigoProduto,
	formatarCst,
	formatarDecimal,
	formatarNumeroDocumento,
	formatarNumerico,
	formatarSerie,
	montarLinha,
} from "../formatador-campo.js";
import type { ItemNotaSintegra } from "../tipos-sintegra.js";

export function montarRegistro54(item: ItemNotaSintegra): string {
	return montarLinha([
		"54",
		formatarCnpjCpf(item.cnpjCpf),
		formatarNumerico(item.modelo, 2),
		formatarSerie(item.serie),
		formatarNumeroDocumento(item.numero),
		formatarCfop(item.cfop),
		formatarCst(item.cst, item.csosn),
		formatarNumerico(item.numeroItem, 3),
		formatarCodigoProduto(item.codigoProduto),
		formatarDecimal(item.quantidade, 11, 3),
		formatarDecimal(item.valorProduto, 12, 2),
		formatarDecimal(item.desconto, 12, 2),
		formatarDecimal(item.baseIcms, 12, 2),
		formatarDecimal(item.baseIcmsSt, 12, 2),
		formatarDecimal(item.valorIpi, 12, 2),
		formatarDecimal(item.aliquotaIcms, 4, 2),
	]);
}
