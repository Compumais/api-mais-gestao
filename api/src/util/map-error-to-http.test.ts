import { describe, expect, it } from "vitest";
import z from "zod";
import { mapErrorToHttpResponse } from "./map-error-to-http.js";

describe("mapErrorToHttpResponse", () => {
	it("formata Zod com campo em português", () => {
		const schema = z.object({
			dataInicio: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
		});
		const parsed = schema.safeParse({ dataInicio: "01/10/2026" });
		expect(parsed.success).toBe(false);
		if (parsed.success) return;
		const mapped = mapErrorToHttpResponse(parsed.error);
		expect(mapped.status).toBe(400);
		expect(mapped.code).toBe("VALIDATION_ERROR");
		expect(mapped.error).toMatch(/data inicial/i);
		expect(mapped.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "dataInicio", campo: "data inicial" }),
			]),
		);
	});

	it("mapeia foreign key e unique do Postgres", () => {
		expect(
			mapErrorToHttpResponse(
				{ code: "23503", message: "insert fails", constraint: "produtos_idgrupo_fkey" },
				"criação do produto",
			),
		).toMatchObject({
			status: 400,
			code: "FOREIGN_KEY_VIOLATION",
		});
		expect(
			mapErrorToHttpResponse({ code: "23505", message: "duplicate" }),
		).toMatchObject({
			status: 409,
			code: "UNIQUE_VIOLATION",
		});
	});

	it("mapeia coluna/tabela ausente com hint de migration", () => {
		expect(
			mapErrorToHttpResponse({
				code: "42703",
				message: 'column "idprodutopai" does not exist',
				column: "idprodutopai",
			}),
		).toMatchObject({
			status: 500,
			code: "UNDEFINED_COLUMN",
			hint: "Coluna: idprodutopai",
		});
		expect(
			mapErrorToHttpResponse({
				code: "42P01",
				message: 'relation "produto_historico" does not exist',
				table: "produto_historico",
			}),
		).toMatchObject({
			status: 500,
			code: "UNDEFINED_TABLE",
			hint: "Tabela: produto_historico",
		});
	});

	it("fallback INTERNAL_ERROR para outros códigos PG", () => {
		const mapped = mapErrorToHttpResponse(
			{ code: "57014", message: "canceling statement due to statement timeout" },
			"consulta de analytics",
		);
		expect(mapped.code).toBe("INTERNAL_ERROR");
		expect(mapped.error).toMatch(/banco/i);
		expect(mapped.hint).toBe("PG 57014");
	});
});
