import type { RemessaBancariaItem } from "@/model/contrato-model.js";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import type { Empresa } from "@/model/empresa-model.js";
import type { Financeiro } from "@/model/financeiro-model.js";
import {
	codigoBancoFebraban,
	dataDdmmaa,
	linhaCnabFixa,
	padLeft,
	padRight,
	somenteDigitos,
	valorCentavos,
} from "@/service/remessa-bancaria/cnab-utils.js";

export type TituloRemessaCnab = {
	titulo: Financeiro;
	item: RemessaBancariaItem;
	sacadoNome: string;
	sacadoDocumento: string;
};

export function montarArquivoCnab400(params: {
	empresa: Empresa;
	conta: ContaCorrente;
	sequencia: number;
	titulos: TituloRemessaCnab[];
	codigoBanco?: string;
}): string {
	const { empresa, conta, sequencia, titulos } = params;
	const banco =
		codigoBancoFebraban(params.codigoBanco) ??
		codigoBancoFebraban(conta.idbanco) ??
		"000";
	const cnpjEmpresa = padLeft(somenteDigitos(empresa.cnpj), 14);
	const agencia = padLeft(somenteDigitos(conta.agencia), 4);
	const contaNum = padLeft(somenteDigitos(conta.numeroconta), 8);
	const nomeEmpresa = padRight((empresa.nome ?? "").toUpperCase(), 30);
	const carteira = padLeft(somenteDigitos(conta.carteira) || "01", 3);
	const linhas: string[] = [];

	// Header CNAB 400 (tipo 0)
	linhas.push(
		linhaCnabFixa(400, [
			"0",
			"1",
			"REMESSA",
			"01",
			padRight("COBRANCA", 15),
			padLeft(`${agencia}${conta.agenciadv ?? "0"}${contaNum}`, 20),
			nomeEmpresa,
			banco,
			padRight("BANCO", 15),
			dataDdmmaa(new Date().toISOString().substring(0, 10)),
			padRight("", 8),
			"MX",
			padLeft(String(sequencia), 7),
			padRight("", 277),
			padLeft("1", 6),
		]),
	);

	let sequenciaRegistro = 2;
	for (const item of titulos) {
		const nossonumero = padLeft(
			somenteDigitos(item.item.nossonumero ?? item.titulo.nossonumero),
			11,
		);
		const dvNosso = padRight(item.titulo.dvnossonumero ?? "0", 1);
		const vencimento = dataDdmmaa(item.titulo.vencimento);
		const documento = padRight(item.titulo.documento ?? "", 10);
		const sacadoDoc = somenteDigitos(item.sacadoDocumento);
		const tipoPessoa = sacadoDoc.length > 11 ? "02" : "01";
		const valor = valorCentavos(item.titulo.valor, 13);

		// Detalhe tipo 1
		linhas.push(
			linhaCnabFixa(400, [
				"1",
				"02",
				cnpjEmpresa,
				padLeft(`${agencia}${conta.agenciadv ?? "0"}`, 5),
				padLeft(contaNum, 8),
				padRight(conta.contadv ?? "0", 1),
				padRight("", 4),
				padRight(item.titulo.id.slice(0, 25), 25),
				banco,
				"000",
				`${nossonumero}${dvNosso}`,
				padLeft("0", 10),
				padRight(carteira.slice(-1), 1),
				" ",
				padRight("", 10),
				"I",
				"01",
				documento,
				vencimento,
				valor,
				banco,
				padLeft("0", 5),
				"01",
				"N",
				dataDdmmaa(item.titulo.emissao ?? item.titulo.vencimento),
				"00",
				"00",
				padLeft("0", 13),
				padLeft("0", 6),
				padLeft("0", 13),
				tipoPessoa,
				padLeft(sacadoDoc, 14),
				padRight(item.sacadoNome.toUpperCase(), 40),
				padRight("", 40),
				padRight("", 12),
				"0",
				padLeft("0", 60),
				padLeft(String(sequenciaRegistro++), 6),
			]),
		);
	}

	// Trailer tipo 9
	linhas.push(
		linhaCnabFixa(400, [
			"9",
			padRight("", 393),
			padLeft(String(sequenciaRegistro), 6),
		]),
	);

	return `${linhas.join("\r\n")}\r\n`;
}
