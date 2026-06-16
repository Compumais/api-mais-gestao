import type { Hierarquia } from "@/services/hierarquias.service";
import type { Produto } from "@/services/produtos.service";

export interface GrupoProdutos {
	grupoId: string;
	nome: string;
	produtos: Produto[];
}

export function filtrarHierarquiasGarcom(hierarquias: Hierarquia[]): Hierarquia[] {
	return hierarquias.filter((h) => h.enviamobile === 1);
}

export function filtrarProdutosGarcom(
	produtos: Produto[],
	gruposIds: Set<string>,
): Produto[] {
	return produtos.filter(
		(p) =>
			p.idgrupo != null &&
			gruposIds.has(p.idgrupo) &&
			p.enviamobile === 1,
	);
}

export function agruparProdutosPorGrupo(
	produtos: Produto[],
	hierarquias: Hierarquia[],
): GrupoProdutos[] {
	const mapaGrupos = new Map(
		hierarquias.map((h) => [h.id, h.nome?.trim() || "Sem nome"]),
	);

	const porGrupo = new Map<string, Produto[]>();

	for (const produto of produtos) {
		if (!produto.idgrupo || !mapaGrupos.has(produto.idgrupo)) continue;
		const lista = porGrupo.get(produto.idgrupo) ?? [];
		lista.push(produto);
		porGrupo.set(produto.idgrupo, lista);
	}

	return hierarquias
		.filter((h) => porGrupo.has(h.id))
		.map((h) => ({
			grupoId: h.id,
			nome: mapaGrupos.get(h.id) ?? "Sem nome",
			produtos: (porGrupo.get(h.id) ?? []).sort((a, b) =>
				a.nome.localeCompare(b.nome, "pt-BR"),
			),
		}));
}

export function filtrarProdutosPorBusca(
	produtos: Produto[],
	busca: string,
): Produto[] {
	if (!busca.trim()) return produtos;
	const termo = busca.toLowerCase();
	return produtos.filter(
		(p) =>
			p.nome.toLowerCase().includes(termo) ||
			p.codigo?.toString().includes(termo) ||
			p.referencia?.toLowerCase().includes(termo),
	);
}

export function getSaldoProduto(
	produto: Produto,
	saldoPorCodigo?: Record<string, number>,
): { quantidade: number | null; semEstoque: boolean; label: string } {
	if (!saldoPorCodigo || produto.codigo == null) {
		return { quantidade: null, semEstoque: false, label: "—" };
	}

	const chave = String(produto.codigo);
	if (!(chave in saldoPorCodigo)) {
		return { quantidade: null, semEstoque: false, label: "—" };
	}

	const quantidade = saldoPorCodigo[chave];
	const semEstoque = quantidade <= 0;
	return {
		quantidade,
		semEstoque,
		label: quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 }),
	};
}
