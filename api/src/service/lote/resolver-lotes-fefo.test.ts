import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cfopRepository from "@/repositories/cfop-repositories.js";
import * as loteRepository from "@/repositories/lote-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as saldoRepository from "@/repositories/saldo-estoque-repositories.js";
import { resolverLotesFefo } from "./resolver-lotes-fefo.js";

vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/lote-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/saldo-estoque-repositories.js");

describe("resolverLotesFefo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			codigo: 10,
			controlalote: 1,
		} as never);
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			quantidade: "15",
		} as never);
	});

	it("escolhe o lote que vence primeiro", async () => {
		vi.mocked(loteRepository.listarLotesPorProduto).mockResolvedValue([
			{
				id: "lote-cedo",
				numero: "A",
				quantidade: "8",
				quantidadefiscal: "8",
				datavalidade: "2026-09-01",
				datafabricacao: "2026-01-01",
				codigoagregacao: null,
			},
			{
				id: "lote-tarde",
				numero: "B",
				quantidade: "10",
				quantidadefiscal: "10",
				datavalidade: "2026-12-01",
				datafabricacao: "2026-01-01",
				codigoagregacao: null,
			},
		] as never);

		const resultado = await resolverLotesFefo({
			idempresa: "emp-1",
			idproduto: "prod-1",
			quantidade: 5,
			dataReferencia: "2026-08-20",
		});

		expect(resultado.lotes).toHaveLength(1);
		expect(resultado.lotes[0]?.idlote).toBe("lote-cedo");
		expect(resultado.lotes[0]?.quantidade).toBe(5);
		expect(resultado.quantidadeFaltante).toBe(0);
	});

	it("bloqueia lote vencido salvo CFOP liberar", async () => {
		vi.mocked(loteRepository.listarLotesPorProduto).mockResolvedValue([
			{
				id: "lote-vencido",
				numero: "V",
				quantidade: "10",
				quantidadefiscal: "10",
				datavalidade: "2026-01-01",
				datafabricacao: null,
				codigoagregacao: null,
			},
		] as never);
		vi.mocked(cfopRepository.buscarCfopPorId).mockResolvedValue({
			permitirbaixarlotevencido: 0,
		} as never);

		const bloqueado = await resolverLotesFefo({
			idempresa: "emp-1",
			idproduto: "prod-1",
			quantidade: 5,
			idcfop: "cfop-1",
			dataReferencia: "2026-08-20",
		});
		expect(bloqueado.lotes).toHaveLength(0);
		expect(bloqueado.quantidadeFaltante).toBe(5);

		vi.mocked(cfopRepository.buscarCfopPorId).mockResolvedValue({
			permitirbaixarlotevencido: 1,
		} as never);

		const liberado = await resolverLotesFefo({
			idempresa: "emp-1",
			idproduto: "prod-1",
			quantidade: 5,
			idcfop: "cfop-1",
			dataReferencia: "2026-08-20",
		});
		expect(liberado.lotes).toHaveLength(1);
		expect(liberado.lotes[0]?.idlote).toBe("lote-vencido");
	});
});
