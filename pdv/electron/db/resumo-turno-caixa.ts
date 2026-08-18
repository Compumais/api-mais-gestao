import { arredondarDinheiro } from "./pagamento";

export type VendaParaResumoTurno = {
	valortotal: number;
	valordinheiro: number;
	valorpix: number;
	valorcartao: number;
	valortroco: number;
	lanc_dinheiro?: number;
	lanc_pix?: number;
	lanc_cartao?: number;
};

export type PagamentosResumoTurno = {
	dinheiro: number;
	cartao: number;
	pix: number;
	prepago: number;
	total: number;
};

export type ResumoTurnoCaixa = {
	qtdVendas: number;
	pagamentos: PagamentosResumoTurno;
	totalVendas: number;
	suprimento: number;
	saldoapurado: number;
	saldoCaixaFisico: number;
};

export type ConferenciaCaixa = {
	saldoinformado: number;
	sobra: number;
	falta: number;
	diferenca: number;
};

function numero(valor: unknown): number {
	const n = Number(valor ?? 0);
	return Number.isFinite(n) ? arredondarDinheiro(n) : 0;
}

export function valoresVendaParaResumo(
	venda: VendaParaResumoTurno,
): VendaParaResumoTurno {
	const lancDinheiro = numero(venda.lanc_dinheiro);
	const lancPix = numero(venda.lanc_pix);
	const lancCartao = numero(venda.lanc_cartao);
	if (lancDinheiro + lancPix + lancCartao > 0) {
		return {
			valortotal: numero(venda.valortotal),
			valordinheiro: lancDinheiro,
			valorpix: lancPix,
			valorcartao: lancCartao,
			valortroco: numero(venda.valortroco),
		};
	}
	return {
		valortotal: numero(venda.valortotal),
		valordinheiro: numero(venda.valordinheiro),
		valorpix: numero(venda.valorpix),
		valorcartao: numero(venda.valorcartao),
		valortroco: numero(venda.valortroco),
	};
}

export function pagamentosVendaTurno(
	venda: VendaParaResumoTurno,
): PagamentosResumoTurno {
	const origem = valoresVendaParaResumo(venda);
	const dinheiroBruto = origem.valordinheiro;
	const troco = origem.valortroco;
	const dinheiro = Math.max(0, arredondarDinheiro(dinheiroBruto - troco));
	const cartao = origem.valorcartao;
	const pix = origem.valorpix;
	const prepago = 0;
	const totalInformado = numero(venda.valortotal);
	const total =
		totalInformado > 0
			? totalInformado
			: arredondarDinheiro(dinheiro + cartao + pix + prepago);

	return { dinheiro, cartao, pix, prepago, total };
}

export function montarResumoTurnoCaixa(params: {
	valorabertura: number;
	vendas: VendaParaResumoTurno[];
}): ResumoTurnoCaixa {
	const pagamentos: PagamentosResumoTurno = {
		dinheiro: 0,
		cartao: 0,
		pix: 0,
		prepago: 0,
		total: 0,
	};

	for (const venda of params.vendas) {
		const parcela = pagamentosVendaTurno(venda);
		pagamentos.dinheiro = arredondarDinheiro(
			pagamentos.dinheiro + parcela.dinheiro,
		);
		pagamentos.cartao = arredondarDinheiro(pagamentos.cartao + parcela.cartao);
		pagamentos.pix = arredondarDinheiro(pagamentos.pix + parcela.pix);
		pagamentos.prepago = arredondarDinheiro(
			pagamentos.prepago + parcela.prepago,
		);
		pagamentos.total = arredondarDinheiro(pagamentos.total + parcela.total);
	}

	const suprimento = numero(params.valorabertura);
	const saldoapurado = pagamentos.total;
	const saldoCaixaFisico = arredondarDinheiro(suprimento + pagamentos.dinheiro);

	return {
		qtdVendas: params.vendas.length,
		pagamentos,
		totalVendas: pagamentos.total,
		suprimento,
		saldoapurado,
		saldoCaixaFisico,
	};
}

export function calcularConferenciaCaixa(
	saldoinformado: number,
	saldoCaixaFisico: number,
): ConferenciaCaixa {
	const informado = numero(saldoinformado);
	const esperado = numero(saldoCaixaFisico);
	const diferenca = arredondarDinheiro(informado - esperado);
	return {
		saldoinformado: informado,
		diferenca,
		sobra: Math.max(0, diferenca),
		falta: Math.max(0, arredondarDinheiro(-diferenca)),
	};
}
