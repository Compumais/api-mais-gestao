import { describe, expect, it } from "vitest";
import { montarObservacaoRemessaFeiraNfe } from "./montar-observacao-remessa-feira-nfe.js";

describe("montarObservacaoRemessaFeiraNfe", () => {
	it("monta evento, período, endereço e fundamento legal", () => {
		const texto = montarObservacaoRemessaFeiraNfe({
			nomeEvento: "Festival da Cachaça",
			dataInicioEvento: "2026-05-28",
			dataFimEvento: "2026-05-31",
			fundamentoLegal: "suspensão do ICMS conforme legislação validada",
			logradouro: "Arena BRB",
			numero: "S/N",
			complemento: "Pavilhão A",
			bairro: "Asa Norte",
			codigoMunicipio: "5300108",
			municipio: "Brasília",
			uf: "DF",
			cep: "70070701",
		});

		expect(texto).toContain("Festival da Cachaça");
		expect(texto).toContain("28/05/2026 a 31/05/2026");
		expect(texto).toContain("Brasília/DF");
		expect(texto).toContain("CEP: 70070701");
		expect(texto).toContain("suspensão do ICMS");
	});

	it("não gera texto sem local de entrega", () => {
		expect(montarObservacaoRemessaFeiraNfe()).toBeUndefined();
	});
});
