import { getTableColumns } from "drizzle-orm";
import type { NovoProduto } from "@/model/produto-model.js";
import { produtos } from "@/repositories/schema.js";
import { normalizarValorNumericoGravacao } from "@/util/campos-impostos-produto.js";

const COLUNAS_NUMERICAS_PRODUTO = new Set(
	Object.entries(getTableColumns(produtos))
		.filter(([, coluna]) => coluna.columnType === "PgNumeric")
		.map(([nome]) => nome),
);

/** Converte `""` em `null` em todas as colunas numeric de `produtos` antes do insert/update. */
export function normalizarCamposNumericosProduto<T extends Partial<NovoProduto>>(
	dados: T,
): T {
	const resultado = { ...dados };
	for (const chave of Object.keys(resultado) as (keyof T)[]) {
		if (!COLUNAS_NUMERICAS_PRODUTO.has(String(chave))) continue;
		const valor = resultado[chave];
		const normalizado = normalizarValorNumericoGravacao(valor);
		if (normalizado !== valor) {
			(resultado as Record<string, unknown>)[chave as string] =
				normalizado ?? null;
		}
	}
	return resultado;
}
