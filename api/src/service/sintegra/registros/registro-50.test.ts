import { describe, expect, it } from "vitest";
import type { NotaSintegra } from "../tipos-sintegra.js";
import { montarRegistro50 } from "./registro-50.js";

function notaBase(parcial: Partial<NotaSintegra> = {}): NotaSintegra {
	return {
		id: "nota-1",
		emissao: "2025-06-15",
		dataCompetencia: "2025-07-10",
		modelo: "55",
		serie: "1",
		numero: "123",
		numeronotafiscal: "123",
		cnpjCpf: "12345678000190",
		inscricaoEstadual: "1234567890",
		uf: "MG",
		cfopCodigo: "1102",
		valorTotal: "100.00",
		baseIcms: "100.00",
		valorIcms: "12.00",
		valorIpi: "0",
		baseIcmsSt: "0",
		valorIcmsSt: "0",
		emitente: "T",
		situacao: "N",
		tipoorigem: 0,
		cancelada: false,
		...parcial,
	};
}

describe("montarRegistro50", () => {
	it("imprime a data de competência da entrada, não a emissão do fornecedor", () => {
		const linha = montarRegistro50({
			nota: notaBase(),
			cfop: "1102",
			aliquota: "12.00",
			valorTotal: 100,
			baseIcms: 100,
			valorIcms: 12,
			valorIsento: 0,
			valorOutras: 0,
		});

		expect(linha).toContain("20250710");
		expect(linha).not.toContain("20250615");
	});
});
