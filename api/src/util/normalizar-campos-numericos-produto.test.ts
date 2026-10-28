import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { produtos } from "@/repositories/schema.js";
import { normalizarCamposNumericosProduto } from "./normalizar-campos-numericos-produto.js";

describe("normalizarCamposNumericosProduto", () => {
	it("converte strings vazias em null nas colunas numeric", () => {
		const resultado = normalizarCamposNumericosProduto({
			nome: "Teste",
			preco: "",
			custoaquisicao: "",
			percentualmva: "",
			comissao: "",
			aliquotaicmsinterna: "18.00",
		});

		expect(resultado.preco).toBeNull();
		expect(resultado.custoaquisicao).toBeNull();
		expect(resultado.percentualmva).toBeNull();
		expect(resultado.comissao).toBeNull();
		expect(resultado.aliquotaicmsinterna).toBe("18.00");
		expect(resultado.nome).toBe("Teste");
	});

	it("normaliza todas as colunas PgNumeric do schema produtos", () => {
		const numericas = Object.entries(getTableColumns(produtos))
			.filter(([, coluna]) => coluna.columnType === "PgNumeric")
			.map(([nome]) => nome);

		expect(numericas.length).toBeGreaterThan(40);
		expect(numericas).toContain("percentualreducaoicms");
		expect(numericas).toContain("cstservico");

		const entrada: Record<string, unknown> = { nome: "x" };
		for (const nome of numericas) {
			entrada[nome] = "";
		}

		const saida = normalizarCamposNumericosProduto(entrada);
		for (const nome of numericas) {
			expect(saida[nome as keyof typeof saida]).toBeNull();
		}
	});
});
