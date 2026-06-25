import { eq, isNull, or, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

export function filtroRegistroAtivo(
	coluna: AnyColumn,
	inativo?: number,
): SQL | undefined {
	if (inativo === undefined) {
		return undefined;
	}

	if (inativo === 0) {
		return or(isNull(coluna), eq(coluna, 0));
	}

	return eq(coluna, inativo);
}
