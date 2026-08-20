import { beforeEach, describe, expect, it, vi } from "vitest";
import * as itemLoteRepository from "@/repositories/nota-fiscal-item-lote-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as upsertLote from "@/service/lote/upsert-lote.js";
import { persistirLotesEntradaItemNf } from "./persistir-lotes-entrada-item-nf.js";

vi.mock("@/repositories/nota-fiscal-item-lote-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/lote/upsert-lote.js");

describe("persistirLotesEntradaItemNf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(upsertLote.upsertLoteCadastro)
			.mockResolvedValueOnce({
				id: "lote-1",
				numero: "L1",
				datafabricacao: "2026-01-01",
				datavalidade: "2026-12-01",
				codigoagregacao: null,
			} as never)
			.mockResolvedValueOnce({
				id: "lote-2",
				numero: "L2",
				datafabricacao: "2026-02-01",
				datavalidade: "2027-01-01",
				codigoagregacao: null,
			} as never);
		vi.mocked(itemLoteRepository.criarNotaFiscalItemLotes).mockResolvedValue(
			[] as never,
		);
		vi.mocked(produtosRepository.atualizarProduto).mockResolvedValue(
			{} as never,
		);
	});

	it("grava todos os rastros do item e liga a flag no produto", async () => {
		const persistidos = await persistirLotesEntradaItemNf({
			idempresa: "emp-1",
			idproduto: "prod-1",
			idnotafiscalitem: "item-1",
			quantidadeEstoque: "10",
			controlaLote: false,
			controlaValidade: false,
			rastros: [
				{
					numeroLote: "L1",
					quantidadeLote: "4",
					dataFabricacao: "2026-01-01",
					dataValidade: "2026-12-01",
				},
				{
					numeroLote: "L2",
					quantidadeLote: "6",
					dataFabricacao: "2026-02-01",
					dataValidade: "2027-01-01",
				},
			],
		});

		expect(produtosRepository.atualizarProduto).toHaveBeenCalledWith("prod-1", {
			controlalote: 1,
			controlavalidade: 1,
		});
		expect(upsertLote.upsertLoteCadastro).toHaveBeenCalledTimes(2);
		expect(persistidos).toHaveLength(2);
		expect(persistidos[0]?.quantidade).toBe("4.000000");
		expect(persistidos[1]?.quantidade).toBe("6.000000");
		expect(itemLoteRepository.criarNotaFiscalItemLotes).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ numero: "L1", idlote: "lote-1" }),
				expect.objectContaining({ numero: "L2", idlote: "lote-2" }),
			]),
		);
	});
});
