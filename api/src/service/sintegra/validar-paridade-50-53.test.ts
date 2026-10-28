import { describe, expect, it } from "vitest";
import type { ValoresRegistro53 } from "./agrupar-valores-registro-53.js";
import { validarParidadeRegistros50e53 } from "./validar-paridade-50-53.js";
import type { AgrupamentoRegistro50, NotaSintegra } from "./tipos-sintegra.js";

const nota: NotaSintegra = {
	id: "n1",
	emissao: "2026-09-28",
	dataCompetencia: "2026-09-28",
	modelo: "55",
	serie: "1",
	numero: "363146",
	numeronotafiscal: "363146",
	cnpjCpf: "77595395004800",
	inscricaoEstadual: "023219980058",
	uf: "MG",
	cfopCodigo: "1101",
	valorTotal: "100",
	baseIcms: "0",
	valorIcms: "0",
	valorIpi: "0",
	baseIcmsSt: "10",
	valorIcmsSt: "1",
	emitente: "T",
	situacao: "N",
	tipoorigem: 0,
	cancelada: false,
};

describe("validarParidadeRegistros50e53", () => {
	it("aceita quando CFOP do 53 existe no 50", () => {
		const agrupamento: AgrupamentoRegistro50 = {
			nota,
			cfop: "1401",
			aliquota: "0",
			valorTotal: 100,
			baseIcms: 0,
			valorIcms: 0,
			valorIsento: 0,
			valorOutras: 100,
		};
		const registro53: ValoresRegistro53 = {
			agrupamento,
			baseIcmsSt: 10,
			valorIcmsSt: 1,
		};
		expect(
			validarParidadeRegistros50e53([agrupamento], [registro53]),
		).toEqual([]);
	});

	it("rejeita CFOP do 53 ausente no 50", () => {
		const agrupamento50: AgrupamentoRegistro50 = {
			nota,
			cfop: "1401",
			aliquota: "0",
			valorTotal: 100,
			baseIcms: 0,
			valorIcms: 0,
			valorIsento: 0,
			valorOutras: 100,
		};
		const agrupamento53: AgrupamentoRegistro50 = {
			...agrupamento50,
			cfop: "1101",
		};
		const erros = validarParidadeRegistros50e53(
			[agrupamento50],
			[{ agrupamento: agrupamento53, baseIcmsSt: 10, valorIcmsSt: 1 }],
		);
		expect(erros).toHaveLength(1);
		expect(erros[0]).toContain("1101");
	});
});
