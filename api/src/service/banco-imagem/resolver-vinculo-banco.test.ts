import { describe, expect, it } from "vitest";
import { camposVinculoPorEan } from "@/service/banco-imagem/resolver-vinculo-banco.js";
import { normalizarCodigoBarras } from "@/util/normalizar-codigo-barras.js";

describe("normalizarCodigoBarras", () => {
	it("mantém só os dígitos", () => {
		expect(normalizarCodigoBarras("789 1000-1234")).toBe("78910001234");
	});

	it("rejeita vazio e código longo demais", () => {
		expect(normalizarCodigoBarras("abc")).toBeNull();
		expect(normalizarCodigoBarras("123456789012345")).toBeNull();
		expect(normalizarCodigoBarras(null)).toBeNull();
	});
});

describe("camposVinculoPorEan", () => {
	const base = {
		eanAnterior: null as string | null,
		eanNovo: "7891000100103",
		eanFoiInformado: true,
		temImagemPropria: false,
		idproduto: "produto-1",
		correspondencia: { id: "banco-1", token: "token-1" },
	};

	it("aponta para o banco quando o código passa a bater", () => {
		expect(camposVinculoPorEan(base)).toEqual({
			idbancoimagem: "banco-1",
			caminhoimagem: "/produtos/produto-1/imagem?v=token-1",
		});
	});

	it("não troca o vínculo se o código não mudou", () => {
		expect(
			camposVinculoPorEan({
				...base,
				eanAnterior: "7891000100103",
			}),
		).toBeNull();
	});

	it("mantém a foto própria", () => {
		expect(
			camposVinculoPorEan({
				...base,
				temImagemPropria: true,
			}),
		).toBeNull();
	});

	it("remove o ponteiro quando o código deixa de existir no banco", () => {
		expect(
			camposVinculoPorEan({
				...base,
				eanAnterior: "7891000100103",
				eanNovo: "7891000100104",
				correspondencia: null,
			}),
		).toEqual({
			idbancoimagem: null,
			caminhoimagem: null,
		});
	});
});
