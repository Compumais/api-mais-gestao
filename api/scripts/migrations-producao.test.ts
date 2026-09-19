import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("integridade das migrations de produção", () => {
	it("0104 referencia a tabela física empresas", () => {
		const sql = readFileSync(
			join(process.cwd(), "drizzle/0104_produto_galeria_imagens.sql"),
			"utf8",
		);

		expect(sql).toContain(
			'FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")',
		);
		expect(sql).not.toContain('REFERENCES "public"."empresa"("id")');
	});
});
