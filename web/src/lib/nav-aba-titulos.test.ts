import { describe, expect, it } from "vitest";
import {
	classificarRotaAba,
	segmentoPareceId,
	tituloCriacaoParaPathname,
	truncarTituloAba,
} from "./nav-aba-titulos";

describe("nav-aba-titulos", () => {
	it("classifica criação, edição e detalhe", () => {
		expect(classificarRotaAba("/produtos/novo")).toEqual({
			tipo: "criacao",
			pathnameParaMatch: "/produtos",
			pathnamePai: "/produtos",
		});
		expect(classificarRotaAba("/ordens-servico/nova")).toEqual({
			tipo: "criacao",
			pathnameParaMatch: "/ordens-servico",
			pathnamePai: "/ordens-servico",
		});
		const id = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
		expect(classificarRotaAba(`/produtos/${id}/editar`)).toEqual({
			tipo: "edicao",
			pathnameParaMatch: "/produtos",
			pathnamePai: "/produtos",
		});
		expect(classificarRotaAba(`/pedidos/${id}`)).toEqual({
			tipo: "detalhe",
			pathnameParaMatch: "/pedidos",
			pathnamePai: "/pedidos",
		});
	});

	it("não trata relatório como detalhe", () => {
		expect(classificarRotaAba("/produtos/relatorios/estoque").tipo).toBe(
			"outra",
		);
		expect(classificarRotaAba("/produtos/relatorios/estoque").pathnameParaMatch).toBe(
			"/produtos/relatorios/estoque",
		);
	});

	it("detecta ids e truncar título", () => {
		expect(segmentoPareceId("a1b2c3d4-e5f6-4789-a012-3456789abcde")).toBe(true);
		expect(segmentoPareceId("estoque")).toBe(false);
		expect(truncarTituloAba("abc", 10)).toBe("abc");
		expect(truncarTituloAba("abcdefghijklmnop", 10).endsWith("…")).toBe(true);
	});

	it("mapeia criação e clonar", () => {
		expect(tituloCriacaoParaPathname("/produtos", "")).toBe("Novo Produto");
		expect(tituloCriacaoParaPathname("/produtos", "clonar=x")).toBe(
			"Clonar Produto",
		);
	});
});
