import { montarLinhaPipe } from "@/util/efd/formatador-pipe.js";
import type { ContadorRegistrosEfd } from "../contador-registros.js";

export function montarRegistro9001(): string {
	return montarLinhaPipe(["9001", "0"]);
}

export function montarRegistros9900(contador: ContadorRegistrosEfd): string[] {
	const tipos = [...contador.obterTodos().keys()].sort();
	if (!tipos.includes("9900")) tipos.push("9900");
	if (!tipos.includes("9990")) tipos.push("9990");
	if (!tipos.includes("9999")) tipos.push("9999");
	if (!tipos.includes("9001")) tipos.unshift("9001");

	const unicos = [...new Set(tipos)];
	return unicos.map((tipo) => {
		let quantidade = contador.obter(tipo);
		if (tipo === "9900") quantidade = unicos.length;
		if (tipo === "9001") quantidade = Math.max(quantidade, 1);
		if (tipo === "9990") quantidade = 1;
		if (tipo === "9999") quantidade = 1;
		return montarLinhaPipe(["9900", tipo, String(quantidade)]);
	});
}

export function montarRegistro9990(qtdLinhas: number): string {
	return montarLinhaPipe(["9990", String(qtdLinhas)]);
}

export function montarRegistro9999(qtdLinhas: number): string {
	return montarLinhaPipe(["9999", String(qtdLinhas)]);
}
