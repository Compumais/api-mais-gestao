import type { RemessaBancariaItem } from "@/model/contrato-model.js";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import type { Empresa } from "@/model/empresa-model.js";
import type { Financeiro } from "@/model/financeiro-model.js";

function padRight(valor: string, tamanho: number): string {
	return valor.slice(0, tamanho).padEnd(tamanho, " ");
}

function padLeft(valor: string, tamanho: number, char = "0"): string {
	return valor.slice(-tamanho).padStart(tamanho, char);
}

function somenteDigitos(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

function valorCentavos(valor: string | null | undefined): string {
	return padLeft(String(Math.round(Number(valor ?? 0) * 100)), 15);
}

export type TituloRemessaCnab = {
	titulo: Financeiro;
	item: RemessaBancariaItem;
	sacadoNome: string;
	sacadoDocumento: string;
};

export function montarArquivoCnab240(params: {
	empresa: Empresa;
	conta: ContaCorrente;
	sequencia: number;
	titulos: TituloRemessaCnab[];
}): string {
	const { empresa, conta, sequencia, titulos } = params;
	const banco = padLeft(somenteDigitos(conta.idbanco).slice(0, 3) || "000", 3);
	const lote = "0001";
	const cnpjEmpresa = padLeft(somenteDigitos(empresa.cnpj), 14);
	const agencia = padLeft(somenteDigitos(conta.agencia), 5);
	const contaNum = padLeft(somenteDigitos(conta.numeroconta), 12);
	const dvConta = padRight(conta.contadv ?? "0", 1);
	const nomeEmpresa = padRight((empresa.nome ?? "").toUpperCase(), 30);
	const linhas: string[] = [];

	// Header arquivo
	linhas.push(
		[
			banco,
			"0000",
			"0",
			padRight("", 9),
			"2",
			cnpjEmpresa,
			padRight(conta.codigocedente ?? "", 20),
			agencia,
			padRight(conta.agenciadv ?? "0", 1),
			contaNum,
			dvConta,
			"0",
			nomeEmpresa,
			padRight("MAIS GESTAO", 30),
			padRight("", 10),
			"1",
			padLeft(new Date().toISOString().substring(0, 10).replace(/-/g, ""), 8),
			padLeft(
				new Date().toISOString().substring(11, 19).replace(/:/g, ""),
				6,
			),
			padLeft(String(sequencia), 6),
			"103",
			"01600",
			padRight("", 20),
			padRight("", 20),
			padRight("", 29),
		].join(""),
	);

	// Header lote
	linhas.push(
		[
			banco,
			lote,
			"1",
			"R",
			"01",
			"00",
			"060",
			" ",
			"2",
			cnpjEmpresa,
			padRight(conta.codigocedente ?? "", 20),
			agencia,
			padRight(conta.agenciadv ?? "0", 1),
			contaNum,
			dvConta,
			"0",
			nomeEmpresa,
			padRight("", 40),
			padRight("", 40),
			padLeft(String(sequencia), 8),
			padLeft(new Date().toISOString().substring(0, 10).replace(/-/g, ""), 8),
			padLeft("0", 8),
			padRight("", 33),
		].join(""),
	);

	let seqLote = 1;
	for (const item of titulos) {
		const nossonumero = padRight(item.item.nossonumero ?? item.titulo.nossonumero ?? "", 20);
		const vencimento = (item.titulo.vencimento ?? "").replace(/-/g, "");
		const documento = padRight(item.titulo.documento ?? "", 15);
		const sacadoDoc = padLeft(somenteDigitos(item.sacadoDocumento), 15);
		const tipoPessoa = somenteDigitos(item.sacadoDocumento).length > 11 ? "2" : "1";

		linhas.push(
			[
				banco,
				lote,
				"3",
				padLeft(String(seqLote++), 5),
				"P",
				" ",
				"01",
				agencia,
				padRight(conta.agenciadv ?? "0", 1),
				contaNum,
				dvConta,
				"0",
				nossonumero,
				padRight(conta.carteira ?? "1", 1),
				"1",
				"1",
				"2",
				"2",
				documento,
				padLeft(vencimento, 8),
				valorCentavos(item.titulo.valor),
				padLeft("0", 5),
				"0",
				"02",
				"N",
				padLeft(vencimento, 8),
				"1",
				padLeft("0", 15),
				padLeft("0", 8),
				padLeft("0", 15),
				padLeft("0", 8),
				padLeft("0", 15),
				padLeft("0", 15),
				padRight(item.titulo.id.slice(0, 25), 25),
				"0",
				padLeft("0", 2),
				"1",
				padLeft("0", 3),
				padLeft("0", 2),
				padLeft("0", 10),
				" ",
			].join(""),
		);

		linhas.push(
			[
				banco,
				lote,
				"3",
				padLeft(String(seqLote++), 5),
				"Q",
				" ",
				"01",
				tipoPessoa,
				sacadoDoc,
				padRight(item.sacadoNome.toUpperCase(), 40),
				padRight("", 40),
				padRight("", 15),
				"0",
				padLeft("0", 15),
				padRight("", 40),
				padLeft("0", 3),
				padRight("", 20),
				padRight("", 8),
			].join(""),
		);
	}

	const qtdRegistrosLote = String(titulos.length * 2 + 2);
	linhas.push(
		[
			banco,
			lote,
			"5",
			padRight("", 9),
			padLeft(qtdRegistrosLote, 6),
			padLeft(String(titulos.length), 6),
			valorCentavos(
				String(
					titulos.reduce((acc, t) => acc + Number(t.titulo.valor ?? 0), 0),
				),
			),
			padLeft("0", 6),
			padLeft("0", 15),
			padLeft("0", 6),
			padLeft("0", 15),
			padRight("", 8),
			padRight("", 117),
		].join(""),
	);

	const qtdLotes = "000001";
	const qtdRegistros = padLeft(String(linhas.length + 1), 6);
	linhas.push(
		[
			banco,
			"9999",
			"9",
			padRight("", 9),
			qtdLotes,
			qtdRegistros,
			padLeft("0", 6),
			padRight("", 205),
		].join(""),
	);

	return `${linhas.join("\r\n")}\r\n`;
}
