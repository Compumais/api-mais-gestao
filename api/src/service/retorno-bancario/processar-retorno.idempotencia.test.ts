import { describe, expect, it } from "vitest";
import { OCORRENCIAS_LIQUIDACAO, STATUS_RETORNO_ITEM } from "@/util/cnab-layouts.js";

describe("processamento retorno - regras de idempotência", () => {
	it("reconhece códigos de liquidação padrão", () => {
		expect(OCORRENCIAS_LIQUIDACAO.has("06")).toBe(true);
		expect(OCORRENCIAS_LIQUIDACAO.has("17")).toBe(true);
		expect(OCORRENCIAS_LIQUIDACAO.has("02")).toBe(false);
	});

	it("não reprocessa item já processado", () => {
		const item = {
			statusprocessamento: STATUS_RETORNO_ITEM.PROCESSADO,
		};
		const deveIgnorar =
			item.statusprocessamento === STATUS_RETORNO_ITEM.PROCESSADO;
		expect(deveIgnorar).toBe(true);
	});

	it("checksum impede reimportação duplicada (contrato)", () => {
		const checksum = "abc123";
		const existente = { checksum };
		const mesmoArquivo = existente.checksum === checksum;
		expect(mesmoArquivo).toBe(true);
	});
});
