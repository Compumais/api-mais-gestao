type RastroItemNfe = {
	nLote: string;
	qLote: number;
	dFab?: string;
	dVal?: string;
	cAgreg?: string;
};

export const SECAO_LOTES_NFE = "--- Lotes ---";

export type ItemObservacaoLoteNfe = {
	descricao: string;
	codigoProduto?: string | null;
	rastros?: RastroItemNfe[];
};

function formatarDataBr(iso?: string): string | null {
	if (!iso?.trim()) return null;
	const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;
	return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatarQuantidade(quantidade: number): string {
	return quantidade.toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 3,
	});
}

function montarLinhaRastro(rastro: RastroItemNfe): string {
	const partes = [
		`Lote ${rastro.nLote.trim()}`,
		`Qtd ${formatarQuantidade(rastro.qLote)}`,
	];
	const fabricacao = formatarDataBr(rastro.dFab);
	const validade = formatarDataBr(rastro.dVal);
	if (fabricacao) partes.push(`Fab ${fabricacao}`);
	if (validade) partes.push(`Val ${validade}`);
	const agregacao = rastro.cAgreg?.trim();
	if (agregacao) partes.push(`Agreg ${agregacao}`);
	return partes.join(", ");
}

export function removerSecaoObservacoesLotesNfe(texto?: string | null): string {
	if (!texto?.trim()) return "";
	const indice = texto.indexOf(SECAO_LOTES_NFE);
	if (indice === -1) return texto.trim();
	return texto.slice(0, indice).trim();
}

export function montarSecaoObservacoesLotesNfe(
	itens: ItemObservacaoLoteNfe[],
): string | null {
	const linhas: string[] = [];

	for (const [indice, item] of itens.entries()) {
		const rastros = (item.rastros ?? []).filter(
			(rastro) => rastro.nLote?.trim() && rastro.qLote > 0,
		);
		if (rastros.length === 0) continue;

		const codigo = item.codigoProduto?.trim();
		const descricao = item.descricao.trim();
		const identificacao = codigo
			? `${codigo} - ${descricao}`
			: descricao || `Item ${indice + 1}`;
		const lotes = rastros.map(montarLinhaRastro).join("; ");
		linhas.push(`${identificacao}: ${lotes}`);
	}

	if (linhas.length === 0) return null;
	return [SECAO_LOTES_NFE, ...linhas].join("\n");
}

export function anexarRastrosInformacoesAdicionaisNfe(
	informacoesAdicionais: string | undefined,
	itens: ItemObservacaoLoteNfe[],
	limite = 2000,
): string | undefined {
	const base = removerSecaoObservacoesLotesNfe(informacoesAdicionais);
	const secaoLotes = montarSecaoObservacoesLotesNfe(itens);
	if (!secaoLotes) return base || undefined;

	const separador = base ? "\n\n" : "";
	const reservadoBase = base.length + separador.length;
	const espacoLotes = limite - reservadoBase;

	if (espacoLotes <= SECAO_LOTES_NFE.length) {
		return base.slice(0, limite) || undefined;
	}

	let secaoFinal = secaoLotes;
	if (secaoLotes.length > espacoLotes) {
		secaoFinal = `${secaoLotes.slice(0, Math.max(espacoLotes - 3, SECAO_LOTES_NFE.length)).trimEnd()}...`;
	}

	const resultado = `${base}${separador}${secaoFinal}`.trim();
	return resultado || undefined;
}
