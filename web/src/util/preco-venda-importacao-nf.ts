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
