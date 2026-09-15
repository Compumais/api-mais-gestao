import { describe, expect, it } from "vitest";
import {
	anexarLegendaSimplesInformacoesAdicionais,
	LEGENDA_SIMPLES_COM_CREDITO,
	LEGENDA_SIMPLES_SEM_CREDITO_ICMS,
	montarLegendaSimplesNacionalNfe,
} from "./montar-legenda-simples-nacional-nfe.js";

describe("montarLegendaSimplesNacionalNfe", () => {
	it("retorna null para CRT regime normal", () => {
		expect(
			montarLegendaSimplesNacionalNfe({ crt: 3, itens: [{ csosn: "102" }] }),
		).toBeNull();
	});

	it("usa legenda curta quando há CSOSN 101", () => {
		expect(
			montarLegendaSimplesNacionalNfe({ crt: 1, itens: [{ csosn: "101" }] }),
		).toBe(LEGENDA_SIMPLES_COM_CREDITO);
	});

	it("usa legenda completa para CSOSN 102", () => {
		expect(
			montarLegendaSimplesNacionalNfe({ crt: 1, itens: [{ csosn: "102" }] }),
		).toBe(LEGENDA_SIMPLES_SEM_CREDITO_ICMS);
	});

	it("não duplica legenda se já existir no texto", () => {
		const resultado = anexarLegendaSimplesInformacoesAdicionais(
			"Observação livre. DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL",
			{ crt: 1, itens: [{ csosn: "102" }] },
		);
		expect(resultado).toContain("Observação livre");
		expect(resultado?.match(/SIMPLES NACIONAL/g)?.length).toBe(1);
	});

	it("anexa legenda ao texto livre", () => {
		const resultado = anexarLegendaSimplesInformacoesAdicionais("Pedido 123", {
			crt: 1,
			itens: [{ csosn: "102" }],
		});
		expect(resultado).toBe(`Pedido 123. ${LEGENDA_SIMPLES_SEM_CREDITO_ICMS}`);
	});
});
