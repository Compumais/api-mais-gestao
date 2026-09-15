import { beforeEach, describe, expect, it, vi } from "vitest";
import * as loteRepository from "@/repositories/lote-repositories.js";
import * as movimentoRepository from "@/repositories/movimento-estoque-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as saldoRepository from "@/repositories/saldo-estoque-repositories.js";
import { registrarMovimentoEstoque } from "./registrar-movimento-estoque.js";

vi.mock("@/repositories/lote-repositories.js");
vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/saldo-estoque-repositories.js");

describe("registrarMovimentoEstoque com lote", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			codigo: 10,
			nome: "Produto lote",
			controlalote: 1,
		} as never);
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			id: 1,
			quantidade: "10",
			quantidadefiscal: "10",
		} as never);
		vi.mocked(saldoRepository.atualizarSaldoEstoque).mockResolvedValue(
			{} as never,
		);
		vi.mocked(movimentoRepository.criarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);
	});

	it("recusa movimento sem lote em produto que controla lote", async () => {
		await expect(
			registrarMovimentoEstoque({
				idempresa: "emp-1",
				idproduto: "prod-1",
				quantidade: "2",
				sentido: "saida",
				tipoestoque: 2,
				tipodocumento: 1,
			}),
		).rejects.toThrow("controla lote");
	});

	it("decrementa saldo do lote e do produto na saída", async () => {
		vi.mocked(loteRepository.buscarLotePorId).mockResolvedValue({
			id: "lote-1",
			idproduto: "prod-1",
			numero: "A",
			quantidade: "8",
			quantidadefiscal: "8",
		} as never);
		vi.mocked(loteRepository.aplicarDeltaSaldoLote).mockResolvedValue(
			{} as never,
		);

		await registrarMovimentoEstoque({
			idempresa: "emp-1",
			idproduto: "prod-1",
			quantidade: "3",
			sentido: "saida",
			tipoestoque: 2,
			tipodocumento: 1,
			idlote: "lote-1",
		});

		expect(loteRepository.aplicarDeltaSaldoLote).toHaveBeenCalledWith(
			"lote-1",
			-3,
			-3,
		);
		expect(saldoRepository.atualizarSaldoEstoque).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				quantidade: "7.000000",
				quantidadefiscal: "7.000000",
			}),
		);
	});

	it("permite saldo operacional negativo na saída sem lote", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			codigo: 10,
			nome: "Produto sem saldo",
			controlalote: 0,
		} as never);
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			id: 1,
			quantidade: "2",
			quantidadefiscal: "2",
		} as never);

		await registrarMovimentoEstoque({
			idempresa: "emp-1",
			idproduto: "prod-1",
			quantidade: "5",
			sentido: "saida",
			tipoestoque: 0,
			tipodocumento: 0,
			permitirSemLote: true,
		});

		expect(saldoRepository.atualizarSaldoEstoque).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				quantidade: "-3.000000",
			}),
		);
	});
});
