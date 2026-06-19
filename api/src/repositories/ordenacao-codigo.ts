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

/**
 * Ordenação ascendente para códigos hierárquicos (ex.: "2 2 9", "2 2 10", "2.2.9").
 * Compara segmentos numéricos em vez de ordenação lexicográfica por string.
 */
export function ordenacaoCodigoHierarquicoAsc(coluna: AnyColumn) {
	return [
		sql`CASE WHEN ${coluna} IS NULL OR trim(${coluna}) = '' THEN 1 ELSE 0 END`,
		sql`COALESCE(
			(
				SELECT array_agg(part::int ORDER BY ord)
				FROM unnest(
					string_to_array(regexp_replace(trim(${coluna}), '[.\\s]+', ' ', 'g'), ' ')
				) WITH ORDINALITY AS t(part, ord)
				WHERE part <> ''
			),
			ARRAY[]::int[]
		)`,
		sql`${coluna} ASC NULLS LAST`,
	];
}
