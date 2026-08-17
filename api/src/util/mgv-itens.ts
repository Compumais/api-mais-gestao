export type ItemMgv = {
	codigo: number;
	descricao: string;
	preco: number;
	ean?: string | null;
	pesavel?: boolean;
	departamento?: number;
	diasValidade?: number;
};

function campoNum(valor: number, tamanho: number): string {
	const n = Math.max(0, Math.trunc(valor));
	return String(n).padStart(tamanho, "0").slice(-tamanho);
}

function campoTxt(valor: string, tamanho: number): string {
	return valor.padEnd(tamanho, " ").slice(0, tamanho);
}

export function removerAcentos(texto: string): string {
	return texto.normalize("NFD").replace(/\p{M}/gu, "");
}

export function produtoEhPesoMgv(produto: {
	pesavel?: number | boolean | null;
	unidademedida?: string | null;
}): boolean {
	if (produto.pesavel === 1 || produto.pesavel === true) return true;
	const u = (produto.unidademedida ?? "").trim().toLowerCase();
	return (
		u === "kg" ||
		u === "kgs" ||
		u === "kilo" ||
		u === "kilos" ||
		u === "kilograma" ||
		u === "quilograma" ||
		u === "quilogramas"
	);
}

export function normalizarDepartamentoMgv(
	valor: string | number | null | undefined,
	padrao = 1,
): number {
	const n =
		typeof valor === "number"
			? valor
			: Number(String(valor ?? "").replace(/\D/g, ""));
	if (!Number.isInteger(n) || n < 1 || n > 99) return padrao;
	return n;
}

export function eanFornecedor12(ean: string | null | undefined): string {
	const digitos = (ean ?? "").replace(/\D/g, "");
	if (digitos.length >= 13) return digitos.slice(0, 12);
	if (digitos.length >= 12) return digitos.slice(-12);
	return digitos.padStart(12, "0");
}

export function precoCentavosMgv(preco: number): number | null {
	if (!Number.isFinite(preco) || preco <= 0) return null;
	const centavos = Math.round(preco * 100);
	if (centavos > 999_999) return null;
	return centavos;
}

export function produtoExportaBalancaMgv(
	exportaBalanca: number | boolean | null | undefined,
): boolean {
	return exportaBalanca === 1 || exportaBalanca === true;
}

export function resolverDiasValidadeMgv(
	produtoDias: number | null | undefined,
	padrao = 0,
): number {
	if (produtoDias == null || produtoDias === 0) return padrao;
	return produtoDias;
}

/**
 * Linha ITENSMGV/TXTitens versão 3 (MGV 6; importável no MGV 7).
 * Campos de tamanho fixo, sem separador, CR+LF no arquivo.
 */
export function montarLinhaItensMgv(item: ItemMgv): string {
	const descricao = removerAcentos(item.descricao.trim().toUpperCase());
	const d1 = descricao.slice(0, 25);
	const d2 = descricao.slice(25, 50);
	const validadeBruta = Math.trunc(item.diasValidade ?? 0);
	const validade =
		validadeBruta === 998 || validadeBruta === 999
			? validadeBruta
			: Math.min(990, Math.max(0, validadeBruta));
	const imprimeDatas = validade >= 1 && validade <= 990 ? "1" : "0";
	const tipo = item.pesavel ? "0" : "1";
	const preco = precoCentavosMgv(item.preco) ?? 0;

	return [
		campoNum(normalizarDepartamentoMgv(item.departamento), 2),
		tipo,
		campoNum(item.codigo, 6),
		campoNum(preco, 6),
		campoNum(validade, 3),
		campoTxt(d1, 25),
		campoTxt(d2, 25),
		"000000",
		"0000",
		"000000",
		imprimeDatas,
		imprimeDatas,
		"0000",
		campoTxt("", 12),
		campoTxt("", 11),
		"0",
		"0000",
		"0000",
		"0000",
		"0000",
		"0000",
		"0000",
		eanFornecedor12(item.ean),
		"000000",
		"||",
		campoTxt("", 35),
		campoTxt("", 35),
		"000000",
		"000000",
		"000000",
	].join("");
}

export function montarArquivoItensMgv(itens: ItemMgv[]): string {
	if (!itens.length) return "";
	return `${itens.map(montarLinhaItensMgv).join("\r\n")}\r\n`;
}
