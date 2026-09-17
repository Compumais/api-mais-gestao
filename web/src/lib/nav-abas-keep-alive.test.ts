import { describe, expect, it } from "vitest";
import {
	cachePaginasVazio,
	deveAtualizarNodePagina,
	evictPaginasFechadas,
	ordenarPaginasParaExibicao,
	registrarVisitaPagina,
} from "./nav-abas-keep-alive";

describe("nav-abas-keep-alive", () => {
	it("abre a primeira rota sem congelar", () => {
		const estado = registrarVisitaPagina(
			cachePaginasVazio(),
			"",
			"/produtos/novo",
		);
		expect(estado.paths).toEqual(["/produtos/novo"]);
		expect(estado.congeladas).toEqual([]);
		expect(deveAtualizarNodePagina(estado.congeladas, "/produtos/novo")).toBe(
			true,
		);
	});

	it("ao trocar de aba congela a anterior e mantém as duas", () => {
		const primeira = registrarVisitaPagina(
			cachePaginasVazio(),
			"",
			"/produtos/novo",
		);
		const estado = registrarVisitaPagina(
			primeira,
			"/produtos/novo",
			"/clientes",
		);

		expect(estado.paths).toEqual(["/produtos/novo", "/clientes"]);
		expect(estado.congeladas).toEqual(["/produtos/novo"]);
		expect(deveAtualizarNodePagina(estado.congeladas, "/produtos/novo")).toBe(
			false,
		);
		expect(deveAtualizarNodePagina(estado.congeladas, "/clientes")).toBe(true);
	});

	it("ao voltar para a aba congelada não descongela", () => {
		const estado = registrarVisitaPagina(
			{
				paths: ["/produtos/novo", "/clientes"],
				congeladas: ["/produtos/novo"],
			},
			"/clientes",
			"/produtos/novo",
		);

		expect(estado.congeladas).toEqual(["/produtos/novo", "/clientes"]);
		expect(deveAtualizarNodePagina(estado.congeladas, "/produtos/novo")).toBe(
			false,
		);
	});

	it("não poda antes de hidratar as abas", () => {
		const estado = {
			paths: ["/produtos/novo", "/clientes"],
			congeladas: ["/produtos/novo"],
		};
		expect(evictPaginasFechadas(estado, "/clientes", [], false)).toBe(estado);
	});

	it("remove do cache a aba fechada", () => {
		const estado = evictPaginasFechadas(
			{
				paths: ["/produtos/novo", "/clientes", "/dashboard"],
				congeladas: ["/produtos/novo", "/clientes"],
			},
			"/dashboard",
			["/clientes", "/dashboard"],
			true,
		);

		expect(estado.paths).toEqual(["/clientes", "/dashboard"]);
		expect(estado.congeladas).toEqual(["/clientes"]);
	});

	it("coloca a página ativa por último para getElementById achar o DOM visível", () => {
		expect(ordenarPaginasParaExibicao(["/a", "/b", "/c"], "/b")).toEqual([
			"/a",
			"/c",
			"/b",
		]);
	});
});
