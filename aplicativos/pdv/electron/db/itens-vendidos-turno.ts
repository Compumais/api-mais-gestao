export type ItemVendidoTurnoLinha = {
	idproduto: string;
	descricao: string;
	quantidade: number;
};

export type ItemVendidoTurnoAgrupado = {
	idproduto: string;
	descricao: string;
	quantidade: number;
};

function arredondarQtd(qtd: number): number {
	if (!Number.isFinite(qtd)) return 0;
	return Math.round(qtd * 1000) / 1000;
}

/** Agrupa linhas de item_venda do turno por produto. */
export function agruparItensVendidosTurno(
	linhas: ItemVendidoTurnoLinha[],
): ItemVendidoTurnoAgrupado[] {
	const mapa = new Map<string, ItemVendidoTurnoAgrupado>();
	for (const linha of linhas) {
		const id = linha.idproduto.trim() || linha.descricao.trim().toUpperCase();
		if (!id) continue;
		const atual = mapa.get(id);
		const qtd = arredondarQtd(Number(linha.quantidade) || 0);
		if (qtd <= 0) continue;
		if (atual) {
			atual.quantidade = arredondarQtd(atual.quantidade + qtd);
			if ((linha.descricao?.trim().length ?? 0) > atual.descricao.length) {
				atual.descricao = linha.descricao.trim();
			}
		} else {
			mapa.set(id, {
				idproduto: linha.idproduto,
				descricao: linha.descricao.trim() || "Item",
				quantidade: qtd,
			});
		}
	}
	return [...mapa.values()].sort((a, b) =>
		a.descricao.localeCompare(b.descricao, "pt-BR", { sensitivity: "base" }),
	);
}

export function formatarQuantidadeItemTurno(qtd: number): string {
	const arred = arredondarQtd(qtd);
	if (Number.isInteger(arred)) return String(arred);
	return arred.toFixed(3).replace(/\.?0+$/, "");
}

export function formatarLinhaItemVendidoTurno(item: ItemVendidoTurnoAgrupado): string {
	const qtd = formatarQuantidadeItemTurno(item.quantidade);
	return `${qtd}X ${item.descricao.trim().toUpperCase()}`;
}
