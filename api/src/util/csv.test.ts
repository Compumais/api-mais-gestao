import { describe, expect, it } from "vitest";
import { gerarCsv, protegerFormulaPlanilha } from "./csv.js";

describe("protegerFormulaPlanilha", () => {
	it("prefixa valores que começam com fórmula", () => {
		expect(protegerFormulaPlanilha("=2+2")).toBe("'=2+2");
		expect(protegerFormulaPlanilha("+cmd")).toBe("'+cmd");
		expect(protegerFormulaPlanilha("-1")).toBe("'-1");
		expect(protegerFormulaPlanilha("@SUM")).toBe("'@SUM");
	});

	it("não altera texto comum nem números", () => {
		expect(protegerFormulaPlanilha("Cliente")).toBe("Cliente");
		expect(protegerFormulaPlanilha(10)).toBe(10);
	});
});

describe("gerarCsv", () => {
	it("gera CSV com BOM, delimitador e fórmula protegida", () => {
		const csv = gerarCsv({
			colunas: ["Nome", "Valor"],
			linhas: [["=2+2", 10]],
		}).toString("utf-8");

		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv).toContain('"Nome";"Valor"');
		expect(csv).toContain("'=2+2");
	});
});
