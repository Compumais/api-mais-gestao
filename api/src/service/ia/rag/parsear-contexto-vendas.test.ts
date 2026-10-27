import { describe, expect, it } from "vitest";
import type { RelatorioFiscalNotaItem } from "@/repositories/nota-fiscal-repositories.js";
import {
	contextoVendasParaPrompt,
	parsearNotasVendas,
} from "./parsear-contexto-vendas.js";

const PERIODO = {
	dataInicio: "2026-10-01",
	dataFim: "2026-10-31",
	rotulo: "outubro/2026",
};

function nota(
	parcial: Partial<RelatorioFiscalNotaItem> & Pick<RelatorioFiscalNotaItem, "id">,
): RelatorioFiscalNotaItem {
	return {
		emissao: "2026-10-10",
		numero: null,
		numeronotafiscal: "10",
		chavenfe: "1".repeat(44),
		modelo: "55",
		tipoorigem: 1,
		valortotalnota: "100.50",
		baseicms: null,
		icms: null,
		pis: null,
		cofins: null,
		status: 100,
		parceiroNome: "Cliente",
		cfopCodigo: "5102",
		cfopDescricao: null,
		...parcial,
	};
}

describe("parsearNotasVendas", () => {
	it("separa NF-e e NFC-e e soma os valores", () => {
		const ctx = parsearNotasVendas(
			[
				nota({ id: "a", modelo: "55", valortotalnota: "100.50" }),
				nota({
					id: "b",
					modelo: "65",
					valortotalnota: "49.50",
					numeronotafiscal: "20",
					parceiroNome: "  ",
				}),
			],
			PERIODO,
		);

		expect(ctx.quantidadeNfe).toBe(1);
		expect(ctx.quantidadeNfce).toBe(1);
		expect(ctx.quantidadeTotal).toBe(2);
		expect(ctx.valorNfe).toBe(100.5);
		expect(ctx.valorNfce).toBe(49.5);
		expect(ctx.valorTotal).toBe(150);
		expect(ctx.documentos[1]?.cliente).toBeNull();
		expect(ctx.documentos[1]?.modelo).toBe("NFC-e");
	});

	it("descreve período vazio sem inventar documento", () => {
		const texto = contextoVendasParaPrompt(parsearNotasVendas([], PERIODO));
		expect(texto).toContain("outubro/2026");
		expect(texto).toContain("Nenhuma nota autorizada");
		expect(texto).toContain("0 documento(s)");
	});
});
