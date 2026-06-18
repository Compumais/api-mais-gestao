import { type AnyColumn, sql } from "drizzle-orm";

/** Ordenação ascendente para colunas inteiras/bigint com nulos ao final. */
export function ordenacaoCodigoNumericoAsc(coluna: AnyColumn) {
	return sql`${coluna} ASC NULLS LAST`;
}

/**
 * Ordenação ascendente para varchar:
 * 1. códigos numéricos (1, 2, 10)
 * 2. alfanuméricos ou nulos por texto
 */
export function ordenacaoCodigoVarcharAsc(coluna: AnyColumn) {
	return [
		sql`CASE WHEN ${coluna} IS NULL THEN 1 WHEN ${coluna} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
		sql`CASE WHEN ${coluna} ~ '^[0-9]+$' THEN CAST(${coluna} AS INTEGER) END NULLS LAST`,
		sql`${coluna} ASC NULLS LAST`,
	];
}
