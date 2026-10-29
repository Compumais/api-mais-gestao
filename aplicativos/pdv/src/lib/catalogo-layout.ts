export type LayoutCatalogoProdutos = "grade" | "lista";

export const CHAVE_CATALOGO_LAYOUT_PRODUTOS = "catalogo_layout_produtos";

export function normalizarLayoutCatalogo(
	valor: string | null | undefined,
): LayoutCatalogoProdutos {
	return valor === "lista" ? "lista" : "grade";
}

/** Classes do container de produtos conforme o modo visual. */
export function classeContainerCatalogo(
	layout: LayoutCatalogoProdutos,
	densidade: "balcao" | "mesa" = "balcao",
): string {
	if (layout === "lista") {
		return "flex flex-1 flex-col gap-1.5 overflow-auto p-0.5";
	}
	const min = densidade === "mesa" ? "9rem" : "10.5rem";
	const gap = densidade === "mesa" ? "gap-2" : "gap-3";
	return `grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(${min},1fr))] ${gap} overflow-auto p-0.5`;
}
