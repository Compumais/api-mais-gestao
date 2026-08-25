import { IconFileInvoice } from "@tabler/icons-react";
import { describe, expect, it } from "vitest";
import {
	alternarUrlNavFixado,
	coletarItensNavFixaveis,
	lerUrlsNavFixados,
	resolverNavFixados,
} from "./nav-fixados";

describe("nav-fixados", () => {
	it("coleta folhas e subitens com URL real", () => {
		const itens = coletarItensNavFixaveis([
			[
				{ title: "Dashboard", url: "/dashboard" },
				{ title: "Pesquisar", url: "#" },
				{
					title: "Documentos",
					icon: IconFileInvoice,
					items: [
						{ title: "Nota fiscal de produto", url: "/nota-fiscal-venda" },
						{ title: "Conciliação", url: "#" },
					],
				},
			],
		]);

		expect(itens.map((item) => item.url)).toEqual([
			"/dashboard",
			"/nota-fiscal-venda",
		]);
		expect(itens[1]?.title).toBe("Nota fiscal de produto");
	});

	it("resolve só atalhos ainda acessíveis, na ordem fixada", () => {
		const resolvidos = resolverNavFixados(
			["/nota-fiscal-venda", "/sumida", "/dashboard"],
			[
				{ url: "/dashboard", title: "Dashboard" },
				{ url: "/nota-fiscal-venda", title: "Nota fiscal de produto" },
			],
		);

		expect(resolvidos.map((item) => item.url)).toEqual([
			"/nota-fiscal-venda",
			"/dashboard",
		]);
	});

	it("fixa no topo e desafixa; respeita o limite", () => {
		const aposFixar = alternarUrlNavFixado(["/pdv"], "/nota-fiscal-venda");
		expect(aposFixar.urls).toEqual(["/nota-fiscal-venda", "/pdv"]);

		const aposDesafixar = alternarUrlNavFixado(
			["/nota-fiscal-venda", "/pdv"],
			"/nota-fiscal-venda",
		);
		expect(aposDesafixar.urls).toEqual(["/pdv"]);

		const noLimite = alternarUrlNavFixado(["/a", "/b"], "/c", 2);
		expect(noLimite.limiteAtingido).toBe(true);
		expect(noLimite.urls).toEqual(["/a", "/b"]);
	});

	it("ignora JSON inválido no storage", () => {
		expect(lerUrlsNavFixados("nao-json")).toEqual([]);
		expect(lerUrlsNavFixados('["/pdv", 1, ""]')).toEqual(["/pdv"]);
	});
});
