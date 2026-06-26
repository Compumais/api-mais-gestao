import { describe, expect, it } from "vitest";
import {
	calcularProximoBackoffMs,
	tratarErroSefazDfe,
} from "./tratar-erros-sefaz-dfe.js";

describe("tratarErroSefazDfe", () => {
	it("deve tratar cStat 137 como parada com sucesso", () => {
		const resultado = tratarErroSefazDfe("137");
		expect(resultado.acao).toBe("parar_sucesso");
	});

	it("deve tratar cStat 138 como continuar", () => {
		const resultado = tratarErroSefazDfe("138");
		expect(resultado.acao).toBe("continuar");
	});

	it("deve tratar cStat 656 como backoff", () => {
		const resultado = tratarErroSefazDfe("656", "Consumo Indevido");
		expect(resultado.acao).toBe("parar_backoff");
	});

	it("deve tratar cStat 593 como certificado inválido", () => {
		const resultado = tratarErroSefazDfe("593");
		expect(resultado.acao).toBe("parar_certificado");
	});

	it("deve tratar cStat 217 com orientação de distribuição DF-e", () => {
		const resultado = tratarErroSefazDfe("217", "NF-e inexistente");
		expect(resultado.acao).toBe("parar_nao_distribuido");
		expect(resultado.mensagem).toContain("[217]");
		expect(resultado.mensagem).toContain("Importar XML");
	});

	it("deve tratar cStat 632 como indisponível no prazo", () => {
		const resultado = tratarErroSefazDfe("632");
		expect(resultado.acao).toBe("parar_nao_distribuido");
		expect(resultado.mensagem).toContain("[632]");
	});
});

describe("calcularProximoBackoffMs", () => {
	it("deve aumentar exponencialmente com cap", () => {
		expect(calcularProximoBackoffMs(1)).toBe(3_600_000);
		expect(calcularProximoBackoffMs(2)).toBe(7_200_000);
		expect(calcularProximoBackoffMs(10)).toBe(86_400_000);
	});
});
