import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";

export type PagamentosResumo = {
	dinheiro: number;
	cartao: number;
	pix: number;
	prepago: number;
	total: number;
};

export type PagamentosRegistro = {
	valordinheiro?: string | null;
	valorcartao?: string | null;
	valorcartaocredito?: string | null;
	valorcartaodebito?: string | null;
	valorpix?: string | null;
	valorprepago?: string | null;
	valortroco?: string | null;
	valortotal?: string | null;
};

export function pagamentosResumoVazio(): PagamentosResumo {
	return { dinheiro: 0, cartao: 0, pix: 0, prepago: 0, total: 0 };
}

export function extrairPagamentosResumo(
	registro: PagamentosRegistro,
): PagamentosResumo {
	const dinheiroBruto = parseValorMonetario(registro.valordinheiro);
	const troco = parseValorMonetario(registro.valortroco);
	const cartao =
		parseValorMonetario(registro.valorcartaocredito) +
		parseValorMonetario(registro.valorcartaodebito) +
		parseValorMonetario(registro.valorcartao);
	const pix = parseValorMonetario(registro.valorpix);
	const prepago = parseValorMonetario(registro.valorprepago);
	const dinheiro = Math.max(0, dinheiroBruto - troco);
	const totalInformado = parseValorMonetario(registro.valortotal);
	const total =
		totalInformado > 0 ? totalInformado : dinheiro + cartao + pix + prepago;

	return { dinheiro, cartao, pix, prepago, total };
}

export function somarPagamentosResumo(
	a: PagamentosResumo,
	b: PagamentosResumo,
): PagamentosResumo {
	return {
		dinheiro: a.dinheiro + b.dinheiro,
		cartao: a.cartao + b.cartao,
		pix: a.pix + b.pix,
		prepago: a.prepago + b.prepago,
		total: a.total + b.total,
	};
}
