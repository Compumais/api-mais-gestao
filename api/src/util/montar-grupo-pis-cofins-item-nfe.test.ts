import { describe, expect, it } from "vitest";
import {
	aplicarPisCofinsItemEmissao,
	CST_PIS_COFINS_FALLBACK_NT,
	cstPisCofinsAusenteOuInvalido,
	montarCofinsItemNfe,
	montarPisItemNfe,
	normalizarCstPisCofins,
	resolverGrupoPisCofins,
	serializarXmlCofins,
	serializarXmlPis,
} from "./montar-grupo-pis-cofins-item-nfe.js";

describe("normalizarCstPisCofins", () => {
	it("preenche CST de 1 dígito com zero à esquerda", () => {
		expect(normalizarCstPisCofins("1")).toBe("01");
		expect(normalizarCstPisCofins(1)).toBe("01");
		expect(normalizarCstPisCofins("7")).toBe("07");
	});

	it("interpreta CST numeric do cadastro (1.00 = 01, não 00)", () => {
		expect(normalizarCstPisCofins("1.00")).toBe("01");
		expect(normalizarCstPisCofins("7.00")).toBe("07");
		expect(normalizarCstPisCofins("49.00")).toBe("49");
		expect(normalizarCstPisCofins(1.0)).toBe("01");
	});

	it("mantém CST de 2 dígitos", () => {
		expect(normalizarCstPisCofins("01")).toBe("01");
		expect(normalizarCstPisCofins("07")).toBe("07");
		expect(normalizarCstPisCofins("49")).toBe("49");
	});

	it("retorna indefinido para vazio", () => {
		expect(normalizarCstPisCofins("")).toBeUndefined();
		expect(normalizarCstPisCofins(null)).toBeUndefined();
		expect(normalizarCstPisCofins(undefined)).toBeUndefined();
	});
});

describe("montarPisItemNfe / montarCofinsItemNfe", () => {
	it("CST 01 com alíquota gera PISAliq / COFINSAliq", () => {
		const pis = montarPisItemNfe({
			cstPis: "01",
			aliquotaPis: 1.65,
			valorProduto: 100,
			quantidade: 1,
		});
		const cofins = montarCofinsItemNfe({
			cstCofins: "01",
			aliquotaCofins: 7.6,
			valorProduto: 100,
			quantidade: 1,
		});

		expect(pis.grupoXml).toBe("PISAliq");
		expect(pis.cst).toBe("01");
		expect(pis.vBC).toBe(100);
		expect(pis.pPIS).toBe(1.65);
		expect(pis.vPIS).toBe(1.65);

		expect(cofins.grupoXml).toBe("COFINSAliq");
		expect(cofins.cst).toBe("01");
		expect(cofins.vCOFINS).toBe(7.6);

		const xmlPis = serializarXmlPis(pis);
		const xmlCofins = serializarXmlCofins(cofins);
		expect(xmlPis).toContain("<PISAliq>");
		expect(xmlPis).not.toMatch(/<PIS>\s*<\/PIS>/);
		expect(xmlCofins).toContain("<COFINSAliq>");
		expect(xmlCofins).not.toMatch(/<COFINS>\s*<\/COFINS>/);
	});

	it("CST 07 gera PISNT / COFINSNT só com CST", () => {
		const pis = montarPisItemNfe({
			cstPis: "07",
			aliquotaPis: 1.65,
			valorProduto: 100,
			quantidade: 1,
		});
		const cofins = montarCofinsItemNfe({
			cstCofins: "07",
			aliquotaCofins: 7.6,
			valorProduto: 100,
			quantidade: 1,
		});

		expect(pis.grupoXml).toBe("PISNT");
		expect(pis.vPIS).toBe(0);
		expect(cofins.grupoXml).toBe("COFINSNT");
		expect(cofins.vCOFINS).toBe(0);

		expect(serializarXmlPis(pis)).toBe(
			"<PIS><PISNT><CST>07</CST></PISNT></PIS>",
		);
		expect(serializarXmlCofins(cofins)).toBe(
			"<COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>",
		);
	});

	it("CST vazio usa fallback 07 NT com filho válido", () => {
		const pis = montarPisItemNfe({
			cstPis: "",
			valorProduto: 50,
			quantidade: 2,
		});
		const cofins = montarCofinsItemNfe({
			cstCofins: null,
			valorProduto: 50,
			quantidade: 2,
		});

		expect(pis.cst).toBe(CST_PIS_COFINS_FALLBACK_NT);
		expect(pis.grupoXml).toBe("PISNT");
		expect(cofins.cst).toBe(CST_PIS_COFINS_FALLBACK_NT);
		expect(cofins.grupoXml).toBe("COFINSNT");

		const xmlPis = serializarXmlPis(pis);
		const xmlCofins = serializarXmlCofins(cofins);
		expect(xmlPis).toContain("<PISNT>");
		expect(xmlPis).not.toMatch(/<PIS>\s*<\/PIS>/);
		expect(xmlCofins).toContain("<COFINSNT>");
		expect(xmlCofins).not.toMatch(/<COFINS>\s*<\/COFINS>/);
	});

	it("CST inválido (00, não mapeado) usa fallback com filho válido", () => {
		expect(resolverGrupoPisCofins("00")).toBeUndefined();
		expect(cstPisCofinsAusenteOuInvalido("00")).toBe(true);

		const pis = montarPisItemNfe({
			cstPis: "00",
			valorProduto: 10,
			quantidade: 1,
		});
		expect(pis.cst).toBe("07");
		expect(pis.grupoXml).toBe("PISNT");
		expect(serializarXmlPis(pis)).toContain("<PISNT>");
	});

	it("nunca serializa PIS/COFINS sem filho", () => {
		const casos = [
			undefined,
			"",
			"1",
			"1.00",
			"01",
			"03",
			"07",
			"49",
			"00",
			99,
		];

		for (const cst of casos) {
			const pis = montarPisItemNfe({
				cstPis: cst,
				aliquotaPis: 1.65,
				valorProduto: 100,
				quantidade: 2,
			});
			const cofins = montarCofinsItemNfe({
				cstCofins: cst,
				aliquotaCofins: 7.6,
				valorProduto: 100,
				quantidade: 2,
			});
			const xmlPis = serializarXmlPis(pis);
			const xmlCofins = serializarXmlCofins(cofins);

			expect(xmlPis).toMatch(/<PIS><(PISAliq|PISQtde|PISNT|PISOutr)>/);
			expect(xmlPis).not.toMatch(/<PIS>\s*<\/PIS>/);
			expect(xmlCofins).toMatch(
				/<COFINS><(COFINSAliq|COFINSQtde|COFINSNT|COFINSOutr)>/,
			);
			expect(xmlCofins).not.toMatch(/<COFINS>\s*<\/COFINS>/);
		}
	});

	it("aplica CST normalizado no item da emissão", () => {
		const item = aplicarPisCofinsItemEmissao({
			quantidade: 1,
			valorUnitario: 10,
			cstPis: "1",
			cstCofins: "",
			aliquotaPis: 1.65,
		});

		expect(item.cstPis).toBe("01");
		expect(item.cstCofins).toBe("07");
	});
});
