import type {
	BuscarRascunhoImportacaoResponse,
	NotaFiscalItemImportacao,
} from "@/services/nota-fiscal.service";

export type ItemPrecoVendaPendente = {
	idItem: string;
	contador: number | null;
	descricao: string;
	precocusto: string;
	precoVenda: string;
};

export type DirecaoArredondamentoPreco = "menos" | "mais";

export function precoVendaPreenchido(valor?: string | null): boolean {
	if (!valor?.trim()) {
		return false;
	}

	const numero = Number.parseFloat(valor.replace(",", "."));
	return !Number.isNaN(numero) && numero > 0;
}

export function obterPrecoCustoItem(item: NotaFiscalItemImportacao): string {
	const dados = item.dadosimportacao;
	if (dados?.precounitarioEstoque?.trim()) {
		return dados.precounitarioEstoque;
	}
	if (dados?.precounitarioXml?.trim()) {
		return dados.precounitarioXml;
	}
	return item.precounitario ?? "0";
}

export function listarItensSemPrecoVenda(
	itens: BuscarRascunhoImportacaoResponse["itens"],
): ItemPrecoVendaPendente[] {
	return itens
		.filter((item) => {
			const status = item.dadosimportacao?.statusVinculo;
			if (status !== "vinculado" && status !== "novo") {
				return false;
			}
			return !precoVendaPreenchido(item.dadosimportacao?.precoVenda);
		})
		.map((item) => ({
			idItem: item.id,
			contador: item.contador,
			descricao:
				item.dadosimportacao?.descricaoFornecedor ??
				item.descricao ??
				`Item ${item.contador ?? ""}`,
			precocusto: obterPrecoCustoItem(item),
			precoVenda: item.dadosimportacao?.precoVenda ?? "",
		}));
}

export function calcularPrecoVendaComMargem(
	precocusto: string,
	margemPercentual: number,
): string {
	const custo = Number.parseFloat(precocusto.replace(",", ".")) || 0;
	const preco = custo * (1 + margemPercentual / 100);
	return preco.toFixed(2);
}

export function arredondarPrecoVenda(
	valor: string,
	direcao: DirecaoArredondamentoPreco,
): string {
	const numero = Number.parseFloat(valor.replace(",", "."));
	if (Number.isNaN(numero) || numero <= 0) {
		return valor;
	}

	const arredondado =
		direcao === "mais"
			? Math.ceil(numero - Number.EPSILON * 1e6)
			: Math.floor(numero + Number.EPSILON * 1e6);

	if (arredondado <= 0) {
		return numero.toFixed(2);
	}

	return arredondado.toFixed(2);
}

export function aplicarArredondamentoPrecoVenda(
	valor: string,
	ativo: boolean,
	direcao: DirecaoArredondamentoPreco,
): string {
	if (!ativo || !precoVendaPreenchido(valor)) {
		return valor;
	}

	return arredondarPrecoVenda(valor, direcao);
}
