import { describe, expect, it, vi } from "vitest";
import { completarRastrosItensEmissao } from "./completar-rastros-emissao.js";

vi.mock("@/repositories/cfop-repositories.js", () => ({
	buscarCfopPorCodigo: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/repositories/lote-repositories.js", () => ({
	buscarLotePorId: vi.fn(),
}));
vi.mock("@/repositories/produtos-repositories.js", () => ({
	buscarProdutoPorId: vi.fn().mockResolvedValue({
		id: "prod-1",
		controlalote: 1,
	}),
}));
vi.mock("@/service/lote/resolver-lotes-fefo.js", () => ({
	resolverLotesFefo: vi.fn().mockResolvedValue({
		lotes: [],
		quantidadeAtendida: 0,
		quantidadeFaltante: 10,
		saldoOrfao: 10,
	}),
}));

describe("completarRastrosItensEmissao", () => {
	it("recusa emissão de item com flag e sem lotes", async () => {
		const resultado = await completarRastrosItensEmissao({
			idempresa: "emp-1",
			itens: [
				{
					idproduto: "prod-1",
					descricao: "Item",
					ncm: "22021000",
					cfop: "5102",
					unidade: "UN",
					quantidade: 10,
					valorUnitario: 1,
				},
			],
		});

		expect(resultado.pendencias.length).toBeGreaterThan(0);
		expect(resultado.pendencias[0]).toContain("controla lote");
		expect(resultado.pendencias[0]).toContain("saldo sem lote");
	});
});
