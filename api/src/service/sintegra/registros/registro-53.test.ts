import { describe, expect, it } from "vitest";
import type { NotaSintegra } from "../tipos-sintegra.js";
import { montarRegistro53 } from "./registro-53.js";

const nota: NotaSintegra = {
	id: "nota-1",
	emissao: "2026-09-10",
	dataCompetencia: "2026-09-10",
	modelo: "55",
	serie: "1",
	numero: "907994",
	numeronotafiscal: "907994",
	cnpjCpf: "23814940000209",
	inscricaoEstadual: "7011457240867",
	uf: "MG",
	cfopCodigo: "1403",
	valorTotal: "32.02",
	baseIcms: "0",
	valorIcms: "0",
	valorIpi: "0",
	baseIcmsSt: "320.16",
	valorIcmsSt: "21.10",
	emitente: "T",
	situacao: "N",
	tipoorigem: 0,
	cancelada: false,
};

describe("montarRegistro53", () => {
	it("grava situação N e código de antecipação em branco", () => {
		const linha = montarRegistro53(nota);

		expect(linha.slice(95, 97)).toBe("N ");
	});
});
