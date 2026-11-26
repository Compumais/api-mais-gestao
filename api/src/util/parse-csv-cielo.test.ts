import { describe, expect, it } from "vitest";
import { parseArquivoRecebiveisCielo } from "./parse-csv-cielo.js";
import { sugerirMatchCielo } from "./sugerir-match-cielo.js";

const CSV_EXEMPLO = `Estabelecimento: 1015918805
Data de pagamento: 27/10/2026 à 25/11/2026
Totalizador
Quantidade de lançamentos;Valor bruto;Taxa/tarifa;Valor líquido
2;157,14;-3,50;153,64
Data de pagamento;Data do lançamento;Data prevista do pagamento;Estabelecimento;Tipo de lançamento;Forma de pagamento;Bandeira;Valor bruto;Valor Taxa/Tarifa;Valor líquido;Status de pagamento;Descrição;Data da venda;Código de autorização;NSU/DOC;Código da venda;Identificação;TID;ID Pix;TxID;ID recorrência;Número do cartão;Número do pedido;Nota fiscal;Canal da venda;Modalidade
27/10/2026;26/09/2026;27/10/2026;1015918805;Venda crédito;Crédito à vista;Visa;79,00;-1,69;77,31;Pago;;26/09/2026;MDCNGJ;387740;2609260210090168435;;TIDABC;;;;;;Máquina;Aluguel
27/10/2026;26/09/2026;27/10/2026;1015918805;Venda parcelada;Crédito parcelado loja 01/04;Mastercard;78,14;-1,81;76,33;Pago;;26/09/2026;908311;387739;2609260310490036257;;;;;;;;Máquina;Aluguel
`;

describe("parseArquivoRecebiveisCielo", () => {
	it("parseia cabeçalho, totalizador e linhas do CSV Cielo", () => {
		const resultado = parseArquivoRecebiveisCielo(CSV_EXEMPLO);
		expect(resultado.estabelecimento).toBe("1015918805");
		expect(resultado.periodoinicio).toBe("2026-10-27");
		expect(resultado.periodofim).toBe("2026-11-25");
		expect(resultado.qtdlancamentos).toBe(2);
		expect(resultado.valorliquido).toBe("153.64");
		expect(resultado.itens).toHaveLength(2);
		expect(resultado.itens[0]?.nsu).toBe("387740");
		expect(resultado.itens[0]?.codigoautorizacao).toBe("MDCNGJ");
		expect(resultado.itens[0]?.valorbruto).toBe("79.00");
		expect(resultado.itens[0]?.parcela).toBe(1);
		expect(resultado.itens[1]?.parcela).toBe(1);
		expect(resultado.itens[1]?.totalparcelas).toBe(4);
		expect(resultado.itens[0]?.tid).toBe("TIDABC");
	});
});

describe("sugerirMatchCielo", () => {
	it("sugere título por NSU e valor", () => {
		const parseado = parseArquivoRecebiveisCielo(CSV_EXEMPLO);
		const sugestao = sugerirMatchCielo(parseado.itens[0]!, [
			{
				id: "fin-1",
				documento: "DOC-1",
				historico: "Venda cartão NSU 387740",
				nossonumero: null,
				nomebandeira: "Visa",
				valor: "79.00",
				saldo: "79.00",
				emissao: "2026-09-26",
				vencimento: "2026-10-27",
				parcela: 1,
				totalparcelas: 1,
			},
			{
				id: "fin-2",
				documento: "DOC-2",
				historico: "Outro",
				nossonumero: null,
				nomebandeira: null,
				valor: "10.00",
				saldo: "10.00",
				emissao: "2026-01-01",
				vencimento: "2026-01-01",
				parcela: 1,
				totalparcelas: 1,
			},
		]);

		expect(sugestao.idfinanceiro).toBe("fin-1");
		expect(sugestao.confianca).toBeGreaterThanOrEqual(40);
	});

	it("não sugere quando a confiança é baixa", () => {
		const parseado = parseArquivoRecebiveisCielo(CSV_EXEMPLO);
		const sugestao = sugerirMatchCielo(parseado.itens[0]!, [
			{
				id: "fin-x",
				documento: "X",
				historico: "Sem relação",
				nossonumero: null,
				nomebandeira: null,
				valor: "999.00",
				saldo: "999.00",
				emissao: "2020-01-01",
				vencimento: "2020-01-01",
				parcela: 2,
				totalparcelas: 2,
			},
		]);
		expect(sugestao.idfinanceiro).toBeNull();
	});
});
