import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PedidoCompra } from "@/model/pedido-compra-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as pedidoRepository from "@/repositories/pedido-compra-repositories.js";
import * as cotacaoService from "@/service/cotacoes-compra/criar-cotacao-compra.js";
import { converterPedidoCompraCotacaoService } from "./converter-pedido-compra-cotacao.js";
import * as pedidosService from "./pedidos-compra.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/pedido-compra-repositories.js");
vi.mock("@/service/cotacoes-compra/criar-cotacao-compra.js");
vi.mock("./pedidos-compra.js");

const pedido = {
	id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
	idempresa: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
	codigo: 8,
	idcotacao: null,
	status: "A",
	observacao: null,
} as PedidoCompra;

describe("converterPedidoCompraCotacaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(pedidoRepository.buscarPedidoCompraPorId).mockResolvedValue(
			pedido,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			pedidoRepository.listarItensPedidoCompraEnriquecidos,
		).mockResolvedValue([
			{
				id: "item-1",
				idpedidocompra: pedido.id,
				idproduto: "cccccccc-cccc-cccc-cccc-cccccccccccc",
				descricao: "Farinha",
				quantidade: "2.000000",
				precounitario: "10.00",
				total: "20.00",
				idcotacaoitem: null,
				codigoproduto: 1,
				nomeproduto: "Farinha",
				descricaoproduto: "Farinha",
			},
		]);
		vi.mocked(cotacaoService.criarCotacaoCompraService).mockResolvedValue({
			success: true,
			status: 201,
			body: {
				id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
				codigo: 4,
				titulo: "Cotação do pedido #8",
			} as never,
		});
		vi.mocked(pedidoRepository.atualizarPedidoCompra).mockResolvedValue({
			...pedido,
			idcotacao: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
		});
		vi.mocked(pedidosService.buscarPedidoCompraPorIdService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				...pedido,
				idcotacao: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
				itens: [],
				cotacaotitulo: "Cotação do pedido #8",
				cotacaocodigo: 4,
			},
		});
	});

	it("converte pedido aberto em cotação rascunho", async () => {
		const resultado = await converterPedidoCompraCotacaoService({
			id: pedido.id,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(cotacaoService.criarCotacaoCompraService).toHaveBeenCalledWith(
			expect.objectContaining({
				titulo: "Cotação do pedido #8",
				idempresa: pedido.idempresa,
			}),
		);
		expect(pedidoRepository.atualizarPedidoCompra).toHaveBeenCalledWith(
			pedido.id,
			expect.objectContaining({
				idcotacao: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
			}),
		);
	});

	it("não converte pedido que já tem cotação", async () => {
		vi.mocked(pedidoRepository.buscarPedidoCompraPorId).mockResolvedValue({
			...pedido,
			idcotacao: "ja-existe",
		});

		const resultado = await converterPedidoCompraCotacaoService({
			id: pedido.id,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(cotacaoService.criarCotacaoCompraService).not.toHaveBeenCalled();
	});
});
