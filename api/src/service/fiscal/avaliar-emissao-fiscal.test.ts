import { describe, expect, it } from "vitest";
import { avaliarEmissaoFiscal } from "./avaliar-emissao-fiscal.js";
import type { RegraFiscalResolvida } from "./resolver-regras-fiscais.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

const REGRAS_NACIONAIS: RegraFiscalResolvida[] = [
	{
		ruleId: "NAC-CFOP-IDDEST-001",
		prioridade: 10,
		vigenciaInicio: "2006-01-01",
		status: "validado",
		condicoes: { escopo: "estrutural", tipo: "cfop_vs_id_dest" },
		resultado: {},
		fontes: [
			{
				orgao: "CONFAZ",
				url: "https://www.confaz.fazenda.gov.br/",
				tipo: "Ajuste SINIEF",
			},
		],
	},
	{
		ruleId: "NAC-CRT-CSOSN-001",
		prioridade: 10,
		vigenciaInicio: "2006-01-01",
		status: "validado",
		condicoes: { escopo: "estrutural", tipo: "crt_csosn" },
		resultado: {},
	},
];

function itemBase(parcial: Partial<ItemPayloadNfe> = {}): ItemPayloadNfe {
	return {
		descricao: "CACHAÇA CARVALHO PET 1 LITRO",
		ncm: "22084000",
		cest: "0200400",
		cfop: "5401",
		unidade: "UN",
		quantidade: 3,
		valorUnitario: 25,
		csosn: "102",
		orig: 0,
		...parcial,
	};
}

describe("avaliarEmissaoFiscal", () => {
	it("XML homologação MG: totais OK, 5401+102+vST0 não confirma ST e bloqueia", () => {
		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "nfe-homolog-mg",
			dataOperacao: "2026-08-19T18:17:06-03:00",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			consumidorFinal: true,
			indIEDest: 9,
			itens: [
				itemBase({ quantidade: 3, valorUnitario: 25 }),
				itemBase({
					descricao: "CACHAÇA BALSAMO 750ML",
					quantidade: 2,
					valorUnitario: 45,
				}),
				itemBase({
					descricao: "CACHAÇA CARVALHO 750 ML",
					quantidade: 3,
					valorUnitario: 45,
				}),
				itemBase({
					descricao: "KIT 175ML",
					quantidade: 1,
					valorUnitario: 70,
				}),
				itemBase({
					descricao: "KIT 50ML",
					quantidade: 1,
					valorUnitario: 60,
				}),
			],
			totaisInformados: { vProd: 430, vNF: 430 },
			regras: REGRAS_NACIONAIS,
		});

		expect(
			relatorio.validacoes.some(
				(item) => item.code === "TOTAIS_OK" && item.status === "VALIDO",
			),
		).toBe(true);
		expect(
			relatorio.validacoes.some((item) => item.code === "CFOP_ST_SEM_VALOR"),
		).toBe(true);
		expect(relatorio.classificacao_final).toBe("REGRA_FISCAL_NAO_CONFIRMADA");
		expect(relatorio.permitir_transmissao).toBe(false);
		expect(relatorio.decisao.st).toBe("INDETERMINADA");
	});

	it("venda interna com CFOP 6xxx é inconsistência confirmada", () => {
		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "cfop-uf",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [itemBase({ cfop: "6102", csosn: "102", cest: undefined })],
			regras: REGRAS_NACIONAIS,
		});

		expect(
			relatorio.validacoes.some((item) => item.code === "CFOP_IDDEST"),
		).toBe(true);
		expect(relatorio.classificacao_final).toBe("ERRO_DE_CONFIGURACAO");
		expect(relatorio.permitir_transmissao).toBe(false);
	});

	it("CRT 1 com CST 00 é inconsistência", () => {
		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "crt-cst",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [
				itemBase({
					cfop: "5102",
					cst: "00",
					csosn: "102",
					cest: undefined,
				}),
			],
			regras: REGRAS_NACIONAIS,
		});

		expect(
			relatorio.validacoes.some((item) => item.code === "CRT_CST_CSOSN"),
		).toBe(true);
		expect(relatorio.permitir_transmissao).toBe(false);
	});

	it("regra de ST validada vigente libera 5401+102+vST0", () => {
		const regraSt: RegraFiscalResolvida = {
			ruleId: "MG-ICMS-ST-22084000-001",
			prioridade: 200,
			vigenciaInicio: "2020-01-01",
			status: "validado",
			condicoes: {
				escopo: "operacao",
				uf_emitente: "MG",
				uf_destinatario: "MG",
				ncm: "22084000",
				cfop_prefixo: "54",
			},
			resultado: {
				st_aplicavel: true,
				fcp_aplicavel: false,
			},
			fontes: [{ orgao: "SEF/MG", url: "https://www.fazenda.mg.gov.br/" }],
		};

		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "st-confirmada",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [itemBase()],
			regras: [...REGRAS_NACIONAIS, regraSt],
		});

		expect(relatorio.decisao.st).toBe("CONFIRMADA");
		expect(relatorio.permitir_transmissao).toBe(true);
	});

	it("regra com vigencia_fim anterior à dhEmi não confirma ST", () => {
		const regraExpirada: RegraFiscalResolvida = {
			ruleId: "MG-ICMS-ST-22084000-OLD",
			prioridade: 200,
			vigenciaInicio: "2010-01-01",
			vigenciaFim: "2020-12-31",
			status: "validado",
			condicoes: {
				escopo: "operacao",
				ncm: "22084000",
				uf_emitente: "MG",
			},
			resultado: { st_aplicavel: true, fcp_aplicavel: false },
		};

		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "st-expirada",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [itemBase()],
			regras: [...REGRAS_NACIONAIS, regraExpirada],
		});

		expect(relatorio.classificacao_final).toBe("REGRA_FISCAL_NAO_CONFIRMADA");
		expect(relatorio.permitir_transmissao).toBe(false);
	});

	it("totais divergentes são bug de sistema e bloqueiam", () => {
		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "totais",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [itemBase({ cfop: "5102", cest: undefined, ncm: "61091000" })],
			totaisInformados: { vNF: 1 },
			regras: REGRAS_NACIONAIS,
		});

		expect(
			relatorio.validacoes.some((item) => item.code === "TOTAL_DIVERGENTE"),
		).toBe(true);
		expect(relatorio.classificacao_final).toBe("BUG_DE_SISTEMA");
		expect(relatorio.permitir_transmissao).toBe(false);
	});

	it("venda interna 5102+102 sem ST segue sem bloqueio", () => {
		const relatorio = avaliarEmissaoFiscal({
			operacaoId: "venda-simples",
			dataOperacao: "2026-08-19",
			crt: 1,
			ufEmitente: "MG",
			ufDestinatario: "MG",
			idDest: 1,
			itens: [
				itemBase({
					cfop: "5102",
					cest: undefined,
					ncm: "61091000",
					descricao: "Camiseta",
				}),
			],
			regras: REGRAS_NACIONAIS,
		});

		expect(relatorio.permitir_transmissao).toBe(true);
		expect(relatorio.decisao.st).toBe("NAO_APLICAVEL");
	});
});
