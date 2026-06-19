import type {
	DadosImportacaoItem,
	RateioCustoImportacaoItem,
} from "@/model/nota-fiscal-importacao-model.js";
import type { ItemCustoNf } from "@/service/custo-produto/registrar-custos-nf.js";

export type CabecalhoRateioNf = {
	totalproduto?: string | null | undefined;
	frete?: string | null | undefined;
	seguro?: string | null | undefined;
	outrasdespesas?: string | null | undefined;
	descontoproduto?: string | null | undefined;
};

function paraNumero(valor?: string | null): number {
	if (!valor?.trim()) return 0;
	const n = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(n) ? 0 : n;
}

function formatarMoeda(valor: number): string {
	return valor.toFixed(2);
}

function ratearProporcional(
	valorTotal: number,
	pesoItem: number,
	pesoTotal: number,
): number {
	if (pesoTotal <= 0 || valorTotal === 0) return 0;
	return (valorTotal * pesoItem) / pesoTotal;
}

export function calcularRateioItensImportacaoNf(
	itens: DadosImportacaoItem[],
	cabecalho: CabecalhoRateioNf,
): Map<number, RateioCustoImportacaoItem> {
	const pesos = itens.map((item) => {
		const qtd = paraNumero(item.quantidadeXml);
		const preco = paraNumero(item.precounitarioXml);
		return qtd * preco;
	});

	const pesoTotal = pesos.reduce((acc, p) => acc + p, 0);
	const freteTotal = paraNumero(cabecalho.frete);
	const seguroTotal = paraNumero(cabecalho.seguro);
	const outrasTotal = paraNumero(cabecalho.outrasdespesas);
	const descontoTotal = paraNumero(cabecalho.descontoproduto);

	const mapa = new Map<number, RateioCustoImportacaoItem>();

	for (let i = 0; i < itens.length; i++) {
		const peso = pesos[i] ?? 0;
		mapa.set(i, {
			frete: formatarMoeda(ratearProporcional(freteTotal, peso, pesoTotal)),
			seguro: formatarMoeda(ratearProporcional(seguroTotal, peso, pesoTotal)),
			outras: formatarMoeda(ratearProporcional(outrasTotal, peso, pesoTotal)),
			desconto: formatarMoeda(
				ratearProporcional(descontoTotal, peso, pesoTotal),
			),
		});
	}

	return mapa;
}

export function calcularCustoContabilItem(
	precounitarioEstoque: string,
	quantidadeEstoque: string,
	rateio?: RateioCustoImportacaoItem,
	tributacao?: DadosImportacaoItem["tributacao"],
): string {
	const qtd = paraNumero(quantidadeEstoque) || 1;
	const base = paraNumero(precounitarioEstoque) * qtd;
	const frete = paraNumero(rateio?.frete);
	const seguro = paraNumero(rateio?.seguro);
	const outras = paraNumero(rateio?.outras);
	const desconto = paraNumero(rateio?.desconto);
	const ipi = paraNumero(tributacao?.ipi);
	const icmsst = paraNumero(tributacao?.icmsst);
	const fcpst = paraNumero(tributacao?.fcpst);

	const custoTotal = base + frete + seguro + outras - desconto + ipi + icmsst + fcpst;
	return formatarMoeda(custoTotal / qtd);
}

export function montarItemCustoNfFromImportacao(
	idproduto: string,
	dados: DadosImportacaoItem,
): ItemCustoNf {
	const rateio = dados.rateio;
	const freteSeguroOutras =
		paraNumero(rateio?.frete) +
		paraNumero(rateio?.seguro) +
		paraNumero(rateio?.outras) -
		paraNumero(rateio?.desconto);

	const custoUnitario =
		dados.custoContabilCalculado ?? dados.precounitarioEstoque;

	return {
		idproduto,
		precocompra: dados.precounitarioEstoque,
		custo: custoUnitario,
		desconto: rateio?.desconto,
		fretesegurooutrasdesp:
			freteSeguroOutras !== 0 ? freteSeguroOutras.toFixed(2) : undefined,
		ipi: dados.tributacao.ipi,
		icmsst: dados.tributacao.icmsst,
		fcpst: dados.tributacao.fcpst,
	};
}
