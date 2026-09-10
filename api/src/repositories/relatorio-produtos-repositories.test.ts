import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const executar = vi.hoisted(() => vi.fn());

vi.mock("./connection.js", () => ({
	db: { execute: executar },
}));

import {
	consultarRelatorioProdutos,
	consultarResumoQualidadeProdutos,
} from "./relatorio-produtos-repositories.js";

const filtros = {
	idempresa: "11111111-1111-4111-8111-111111111111",
	page: 1,
	limit: 20,
	ordem: "asc" as const,
};

function obterSql(consulta: SQL): string {
	return new PgDialect().sqlToQuery(consulta).sql;
}

describe("queries do relatório de qualidade", () => {
	beforeEach(() => {
		executar.mockReset();
		executar.mockResolvedValue({ rows: [] });
	});

	it("não depende do schema introduzido pela migration 0096", async () => {
		await consultarRelatorioProdutos("qualidade", filtros);
		await consultarResumoQualidadeProdutos(filtros);

		expect(executar).toHaveBeenCalledTimes(2);

		for (const [consulta] of executar.mock.calls as Array<[SQL]>) {
			const texto = obterSql(consulta);

			expect(texto).toContain("FROM produtos p");
			expect(texto).toContain("FROM saldoestoque se");
			expect(texto).not.toMatch(
				/\b(marca|produto_ean|tabela_preco|tabela_preco_item)\b/,
			);
			expect(texto).not.toContain("p.idmarca");
		}
	});
});
