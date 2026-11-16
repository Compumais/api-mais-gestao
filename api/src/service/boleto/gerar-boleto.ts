import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizaContaCorrente,
	buscarContaCorrentePorId,
} from "@/repositories/conta-corrente-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type GerarBoletoParametros = {
	idfinanceiro: string;
	idcontacorrente: string;
};

export type ResultadoGerarBoleto = {
	idfinanceiro: string;
	nossonumero: string;
	dvnossonumero: string;
	codigobarras: string;
	codigodigitado: string;
	jaExistia: boolean;
};

function calcularDvModulo11(numero: string): string {
	let soma = 0;
	let peso = 2;
	for (let i = numero.length - 1; i >= 0; i--) {
		soma += Number(numero[i]) * peso;
		peso = peso === 9 ? 2 : peso + 1;
	}
	const resto = soma % 11;
	const dv = 11 - resto;
	if (dv === 0 || dv === 10 || dv === 11) return "0";
	return String(dv);
}

function somenteDigitos(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

function montarCodigoBarras(params: {
	codigobanco: string;
	fatorVencimento: string;
	valor: string;
	campoLivre: string;
}): { codigobarras: string; codigodigitado: string } {
	const moeda = "9";
	const semDv =
		params.codigobanco.padStart(3, "0").slice(0, 3) +
		moeda +
		params.fatorVencimento.padStart(4, "0").slice(0, 4) +
		params.valor.padStart(10, "0").slice(-10) +
		params.campoLivre.padStart(25, "0").slice(0, 25);

	const dv = calcularDvModulo11(semDv);
	const codigobarras = `${semDv.slice(0, 4)}${dv}${semDv.slice(4)}`;

	const campo1 = `${codigobarras.slice(0, 4)}${codigobarras.slice(19, 24)}`;
	const campo2 = `${codigobarras.slice(24, 34)}`;
	const campo3 = `${codigobarras.slice(34, 44)}`;
	const campo4 = codigobarras.slice(4, 5);
	const campo5 = `${codigobarras.slice(5, 19)}`;

	const dv1 = calcularDvModulo11(campo1);
	const dv2 = calcularDvModulo11(campo2);
	const dv3 = calcularDvModulo11(campo3);

	const codigodigitado = `${campo1.slice(0, 5)}.${campo1.slice(5)}${dv1} ${campo2.slice(0, 5)}.${campo2.slice(5)}${dv2} ${campo3.slice(0, 5)}.${campo3.slice(5)}${dv3} ${campo4} ${campo5}`;

	return { codigobarras, codigodigitado };
}

function fatorVencimento(vencimento: string): string {
	const base = new Date("1997-10-07T00:00:00Z");
	const venc = new Date(`${vencimento}T00:00:00Z`);
	const diff = Math.floor((venc.getTime() - base.getTime()) / 86_400_000);
	return String(Math.max(diff, 0)).padStart(4, "0");
}

export async function gerarBoletoService({
	idfinanceiro,
	idcontacorrente,
}: GerarBoletoParametros): Promise<HttpResponse<ResultadoGerarBoleto>> {
	const titulo = await buscarFinanceiroPorId(idfinanceiro);
	if (!titulo) return httpNaoEncontrado();

	if (titulo.nossonumero && titulo.codigobarras) {
		return httpOk({
			idfinanceiro,
			nossonumero: titulo.nossonumero,
			dvnossonumero: titulo.dvnossonumero ?? "0",
			codigobarras: titulo.codigobarras,
			codigodigitado: titulo.codigodigitado ?? titulo.codigobarras,
			jaExistia: true,
		});
	}

	const conta = await buscarContaCorrentePorId({ id: idcontacorrente });
	if (!conta || conta.idempresa !== titulo.idempresa) {
		return httpBadRequest("Conta corrente de cobrança não encontrada");
	}

	const proximo = (conta.nossonumeroseq ?? 0) + 1;
	const nossonumero = String(proximo).padStart(11, "0");
	const dvnossonumero = calcularDvModulo11(nossonumero);
	const carteira = (conta.carteira ?? "01").padStart(2, "0").slice(0, 2);
	const cedente = somenteDigitos(conta.codigocedente).padStart(7, "0").slice(-7);
	const campoLivre = `${carteira}${nossonumero}${dvnossonumero}${cedente}0`.padEnd(
		25,
		"0",
	);
	const valorCentavos = String(
		Math.round(Number(titulo.valor ?? 0) * 100),
	).padStart(10, "0");
	const { codigobarras, codigodigitado } = montarCodigoBarras({
		codigobanco: "000",
		fatorVencimento: fatorVencimento(titulo.vencimento ?? ""),
		valor: valorCentavos,
		campoLivre,
	});

	await atualizaContaCorrente({
		id: idcontacorrente,
		dados: { nossonumeroseq: proximo },
	});

	const atualizado = await atualizarFinanceiro(idfinanceiro, {
		nossonumero,
		dvnossonumero,
		codigobarras,
		codigodigitado,
		idcontageraboleto: idcontacorrente,
		idcarteirageradauboleto: carteira,
		boletoimpresso: 0,
		remessagerada: titulo.remessagerada ?? 0,
	});

	if (!atualizado) {
		return httpBadRequest("Falha ao gravar dados do boleto no título");
	}

	return httpOk({
		idfinanceiro,
		nossonumero,
		dvnossonumero,
		codigobarras,
		codigodigitado,
		jaExistia: false,
	});
}
