import {
	campoDataDdmmaaaa,
	campoDecimal,
	campoTexto,
	montarLinhaPipe,
} from "@/util/efd/formatador-pipe.js";
import type { InventarioEfd } from "../tipos-efd-icms.js";

export function montarRegistroH001(indMov: "0" | "1"): string {
	return montarLinhaPipe(["H001", indMov]);
}

export function montarRegistroH005(
	dataInventario: string,
	valorTotal: number,
): string {
	return montarLinhaPipe([
		"H005",
		campoDataDdmmaaaa(dataInventario),
		campoDecimal(valorTotal),
		"01",
	]);
}

export function montarRegistroH010(item: InventarioEfd): string {
	return montarLinhaPipe([
		"H010",
		campoTexto(item.codigoProduto, 60),
		campoTexto(item.unidade ?? "UN", 6),
		campoDecimal(item.quantidade, 3),
		campoDecimal(item.valorUnitario, 6),
		campoDecimal(item.valorTotal),
		item.indicadorPosse || "1",
		"",
		"",
		"",
		"",
	]);
}

export function montarRegistroH990(qtdLinhas: number): string {
	return montarLinhaPipe(["H990", String(qtdLinhas)]);
}
