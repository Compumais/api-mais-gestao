import { describe, expect, it } from "vitest";
import {
	LEGENDA_SIMPLES_SEM_CREDITO_ICMS,
	montarLegendaSimplesNacionalNfe,
} from "./montar-legenda-simples-nacional-nfe.js";
import { montarObservacoesLegaisNfe } from "./montar-observacoes-legais-nfe.js";
import { montarTextoTributosAproximadosIbpt } from "./parsear-arquivo-ibpt.js";

describe("montarObservacoesLegaisNfe", () => {
	it("compõe texto livre, Simples e IBPT", () => {
		const legenda =
			montarLegendaSimplesNacionalNfe({
				crt: 1,
				itens: [{ csosn: "102" }],
			}) ?? "";
		const textoIbpt = montarTextoTributosAproximadosIbpt({
			totalFederal: 10.5,
			totalEstadual: 5.25,
			totalMunicipal: 0,
			uf: "MG",
			chave: "47C8DA",
		});

		const resultado = montarObservacoesLegaisNfe({
			informacoesAdicionais: "Pedido 999",
			crt: 1,
			itens: [{ descricao: "Produto", ncm: "22030000", cfop: "5102", unidade: "UN", quantidade: 1, valorUnitario: 100, csosn: "102" }],
			tributosIbpt: { texto: textoIbpt, totalAproximado: 15.75 },
		});

		expect(resultado.textoUsuario).toBe("Pedido 999");
		expect(resultado.informacoesAdicionais).toContain("Pedido 999");
		expect(resultado.informacoesAdicionais).toContain(legenda);
		expect(resultado.informacoesAdicionais).toContain("Trib aprox");
		expect(resultado.legendaSimples).toBe(LEGENDA_SIMPLES_SEM_CREDITO_ICMS);
		expect(resultado.textoIbpt).toBe(textoIbpt);
	});

	it("respeita limite de 2000 caracteres", () => {
		const textoLongo = "A".repeat(1950);
		const resultado = montarObservacoesLegaisNfe({
			informacoesAdicionais: textoLongo,
			crt: 1,
			itens: [{ descricao: "Produto", ncm: "22030000", cfop: "5102", unidade: "UN", quantidade: 1, valorUnitario: 100, csosn: "102" }],
			limite: 2000,
		});

		expect(resultado.informacoesAdicionais?.length ?? 0).toBeLessThanOrEqual(
			2000,
		);
	});

	it("remove blocos automáticos ao regenerar a partir do texto montado", () => {
		const montado = montarObservacoesLegaisNfe({
			informacoesAdicionais: "Obs cliente",
			crt: 1,
			itens: [{ descricao: "Produto", ncm: "22030000", cfop: "5102", unidade: "UN", quantidade: 1, valorUnitario: 100, csosn: "102" }],
			tributosIbpt: {
				texto: "Trib aprox R$ 1,00 Federal Fonte: IBPT/empresometro.com.br MG ABCD12",
				totalAproximado: 1,
			},
		});

		const regenerado = montarObservacoesLegaisNfe({
			informacoesAdicionais: montado.informacoesAdicionais,
			crt: 1,
			itens: [{ descricao: "Produto", ncm: "22030000", cfop: "5102", unidade: "UN", quantidade: 1, valorUnitario: 100, csosn: "102" }],
			tributosIbpt: {
				texto: "Trib aprox R$ 2,00 Federal Fonte: IBPT/empresometro.com.br MG ABCD12",
				totalAproximado: 2,
			},
		});

		expect(regenerado.textoUsuario).toBe("Obs cliente");
		expect(regenerado.informacoesAdicionais).toContain("R$ 2,00");
	});
});

describe("montarTextoTributosAproximadosIbpt", () => {
	it("formata texto com Federal e Estadual", () => {
		const texto = montarTextoTributosAproximadosIbpt({
			totalFederal: 10,
			totalEstadual: 5,
			totalMunicipal: 0,
			uf: "SP",
			chave: "AB12CD",
		});
		expect(texto).toBe(
			"Trib aprox R$ 10,00 Federal e R$ 5,00 Estadual Fonte: IBPT/empresometro.com.br SP AB12CD",
		);
	});

	it("inclui municipal quando maior que zero", () => {
		const texto = montarTextoTributosAproximadosIbpt({
			totalFederal: 1,
			totalEstadual: 2,
			totalMunicipal: 3,
			uf: "RJ",
			chave: "ZZ99AA",
		});
		expect(texto).toContain("Municipal");
	});
});
