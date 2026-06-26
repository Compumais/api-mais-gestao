import {
	formatarAlfanumerico,
	formatarCnpjCpf,
	formatarCodigoProduto,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarInscricaoEstadual,
	formatarNumerico,
	montarLinha,
} from "../formatador-campo.js";
import type { InventarioSintegra } from "../tipos-sintegra.js";

export function montarRegistro74(item: InventarioSintegra): string {
	const possePropria = item.codigoPosse === "1";

	return montarLinha([
		"74",
		formatarDataAaaammdd(item.dataInventario),
		formatarCodigoProduto(item.codigoProduto),
		formatarDecimal(item.quantidade, 13, 3),
		formatarDecimal(item.valorTotal, 13, 2),
		item.codigoPosse,
		possePropria ? formatarNumerico("0", 14) : formatarCnpjCpf(item.cnpjPossuidor),
		possePropria
			? formatarAlfanumerico("", 14)
			: formatarInscricaoEstadual(item.inscricaoEstadualPossuidor),
		possePropria
			? formatarAlfanumerico("", 2)
			: formatarAlfanumerico(item.ufPossuidor, 2),
		formatarAlfanumerico("", 45),
	]);
}
