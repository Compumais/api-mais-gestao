import { beforeEach, describe, expect, it, vi } from "vitest";
import * as movimentoRepository from "@/repositories/movimento-estoque-repositories.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import { complementarBaixaFiscalVendaPdv } from "./complementar-baixa-fiscal-venda-pdv.js";
import * as registrarMovimento from "./registrar-movimento-estoque.js";

vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("./registrar-movimento-estoque.js");
vi.mock("@/service/producao/garantir-producao-na-venda.js", () => ({
	garantirProducaoNaVendaService: vi.fn().mockResolvedValue({
		success: true,
		status: 200,
		body: { executada: false, jaExistia: false },
	}),
}));

describe("complementarBaixaFiscalVendaPdv", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			movimentoRepository.listarMovimentosEstoquePorIdOriginal,
		).mockResolvedValue([]);
		vi.mocked(registrarMovimento.registrarMovimentoEstoque).mockResolvedValue({
			id: 10,
		} as never);
	});

	it("registra saída fiscal para itens sem baixa fiscal", async () => {
		const resultado = await complementarBaixaFiscalVendaPdv({
			idempresa: "emp-1",
			idvenda: "venda-1",
			itens: [
				{ idproduto: "prod-1", quantidade: "2", precounitario: "5" },
			],
		});

		expect(resultado.movimentosRegistrados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.FISCAL,
				sentido: "saida",
				idoriginal: "venda-1",
				iditemoriginal: "prod-1",
			}),
		);
	});

	it("não duplica quando já existe movimento fiscal ou ambos", async () => {
		vi.mocked(
			movimentoRepository.listarMovimentosEstoquePorIdOriginal,
		).mockResolvedValue([
			{
				iditemoriginal: "prod-1",
				cancelado: 0,
				tipoestoque: TIPO_ESTOQUE.AMBOS,
			},
		] as never);

		const resultado = await complementarBaixaFiscalVendaPdv({
			idempresa: "emp-1",
			idvenda: "venda-1",
			itens: [
				{ idproduto: "prod-1", quantidade: "2", precounitario: "5" },
			],
		});

		expect(resultado.movimentosRegistrados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
	});
});
