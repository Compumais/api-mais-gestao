import { describe, expect, it } from "vitest";
import {
	fecharAbaAberta,
	lerAbasAbertas,
	montarHrefAba,
	registrarAbaAberta,
	resolverTituloAba,
} from "./nav-abas-abertas";

describe("nav-abas-abertas", () => {
	it("monta href com e sem search", () => {
		expect(montarHrefAba("/produtos", "")).toBe("/produtos");
		expect(montarHrefAba("/produtos", "q=1")).toBe("/produtos?q=1");
		expect(montarHrefAba("/produtos", "?q=1")).toBe("/produtos?q=1");
	});

	it("abre rota nova e atualiza a mesma pathname", () => {
		const abertas = registrarAbaAberta([], "/produtos", "", "Produtos");
		expect(abertas).toEqual([
			{ id: "/produtos", href: "/produtos", title: "Produtos" },
		]);

		const atualizadas = registrarAbaAberta(
			abertas,
			"/produtos",
			"page=2",
			"Produtos",
		);
		expect(atualizadas).toEqual([
			{ id: "/produtos", href: "/produtos?page=2", title: "Produtos" },
		]);
	});

	it("remove a mais antiga ao atingir o limite", () => {
		const base = [
			{ id: "/a", href: "/a", title: "A" },
			{ id: "/b", href: "/b", title: "B" },
		];
		const resultado = registrarAbaAberta(base, "/c", "", "C", 2);
		expect(resultado.map((a) => a.id)).toEqual(["/b", "/c"]);
	});

	it("ao fechar a aba ativa navega para a vizinha", () => {
		const abas = [
			{ id: "/a", href: "/a", title: "A" },
			{ id: "/b", href: "/b", title: "B" },
			{ id: "/c", href: "/c", title: "C" },
		];
		expect(fecharAbaAberta(abas, "/b", "/b")).toEqual({
			abas: [
				{ id: "/a", href: "/a", title: "A" },
				{ id: "/c", href: "/c", title: "C" },
			],
			navegarPara: "/c",
		});
		expect(fecharAbaAberta(abas, "/a", "/b").navegarPara).toBeNull();
	});

	it("resolve título pelo item de nav mais específico", () => {
		const titulo = resolverTituloAba("/produtos/relatorios/estoque", "", [
			{ url: "/produtos", title: "Produtos" },
			{ url: "/produtos/relatorios", title: "Relatórios" },
		]);
		expect(titulo).toBe("Relatórios");
	});

	it("ignora JSON inválido no storage", () => {
		expect(lerAbasAbertas("nao-json")).toEqual([]);
		expect(lerAbasAbertas('[{"id":"/a","href":"/a","title":"A"},1]')).toEqual([
			{ id: "/a", href: "/a", title: "A" },
		]);
	});
});
