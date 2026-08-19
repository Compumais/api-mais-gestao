import { describe, expect, it } from "vitest";
import {
	interpretarConsultaLote,
	mapearActivationInfo,
} from "@/lib/dominio-client.js";

describe("mapearActivationInfo", () => {
	it("aceita campos em inglês da API Onvio", () => {
		const info = mapearActivationInfo({
			accountingOfficeName: "Contábil Silva",
			clientName: "Loja ABC",
			clientFederalId: "12.345.678/0001-90",
		});

		expect(info.nomeEscritorio).toBe("Contábil Silva");
		expect(info.nomeCliente).toBe("Loja ABC");
		expect(info.cnpjCliente).toBe("12.345.678/0001-90");
	});
});

describe("interpretarConsultaLote", () => {
	it("detecta arquivo armazenado pela mensagem da API", () => {
		const resultado = interpretarConsultaLote({
			id: "ABC123",
			message: "Arquivo armazenado na API",
		});

		expect(resultado.armazenado).toBe(true);
		expect(resultado.idLote).toBe("ABC123");
	});
});
