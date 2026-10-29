import type { ProdutoLocal } from "./pdv-types";

export type EstadoBuscaProdutos = {
	termo: string;
	produtos: ProdutoLocal[];
	buscando: boolean;
};

export const ESTADO_BUSCA_PRODUTOS_VAZIO: EstadoBuscaProdutos = {
	termo: "",
	produtos: [],
	buscando: false,
};

export function pareceCodigoBarras(valor: string): boolean {
	return /^\d{8,}$/.test(valor.trim());
}

export function termoBuscaProduto(valor: string): string {
	const termo = valor.trim();
	if (!termo || pareceCodigoBarras(termo)) return "";
	return termo;
}

export function podeBuscarProdutos(valor: string): boolean {
	return termoBuscaProduto(valor).length >= 2;
}

export type ModoCatalogoProdutos = "grupos" | "produtos" | "busca";

export function obterModoCatalogoProdutos(
	termo: string,
	grupoSelecionado: boolean,
): ModoCatalogoProdutos {
	if (termoBuscaProduto(termo)) return "busca";
	return grupoSelecionado ? "produtos" : "grupos";
}
