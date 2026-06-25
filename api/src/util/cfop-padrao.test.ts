import { describe, expect, it } from "vitest";
import {
	inferirTipoMovimentoCfop,
	montarCfopsPadrao,
	quantidadeCfopsPadrao,
} from "@/util/cfop-padrao.js";

describe("montarCfopsPadrao", () => {
	const idempresa = "empresa-teste-123";
	const timestampMillis = 1_700_000_000_000;

	it("deve montar todos os CFOPs padrão para a empresa", () => {
		const cfops = montarCfopsPadrao(idempresa, timestampMillis);

		expect(cfops).toHaveLength(quantidadeCfopsPadrao());
	});

	it("deve vincular todos os CFOPs à empresa informada", () => {
		const cfops = montarCfopsPadrao(idempresa, timestampMillis);

		expect(cfops.every((registro) => registro.idempresa === idempresa)).toBe(
			true,
		);
	});

	it("deve incluir CFOPs de entrada e saída", () => {
		const cfops = montarCfopsPadrao(idempresa, timestampMillis);
		const codigos = cfops.map((registro) => registro.codigo ?? "");

		expect(codigos).toContain("1101");
		expect(codigos).toContain("5101");
	});

	it("deve gerar IDs únicos a cada montagem", () => {
		const primeiroLote = montarCfopsPadrao(idempresa, timestampMillis);
		const segundoLote = montarCfopsPadrao(idempresa, timestampMillis);

		const idsPrimeiroLote = primeiroLote.map((registro) => registro.id);
		const idsSegundoLote = segundoLote.map((registro) => registro.id);

		expect(idsPrimeiroLote).not.toEqual(idsSegundoLote);
	});
});

describe("inferirTipoMovimentoCfop", () => {
	it("deve identificar CFOP de entrada", () => {
		expect(inferirTipoMovimentoCfop("1101")).toBe("E");
		expect(inferirTipoMovimentoCfop("2102")).toBe("E");
		expect(inferirTipoMovimentoCfop("3101")).toBe("E");
	});

	it("deve identificar CFOP de saída", () => {
		expect(inferirTipoMovimentoCfop("5101")).toBe("S");
		expect(inferirTipoMovimentoCfop("6102")).toBe("S");
		expect(inferirTipoMovimentoCfop("7101")).toBe("S");
	});
});
