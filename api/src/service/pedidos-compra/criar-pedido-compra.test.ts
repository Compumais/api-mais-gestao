import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import type { PedidoCompra } from "@/model/pedido-compra-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as pedidoRepository from "@/repositories/pedido-compra-repositories.js";
import * as produtoRepository from "@/repositories/produtos-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as cotacaoService from "@/service/cotacoes-compra/criar-cotacao-compra.js";
import { criarPedidoCompraService } from "./criar-pedido-compra.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/pedido-compra-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/cotacoes-compra/criar-cotacao-compra.js");

const fornecedor = {
	id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
	idempresa: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
	nome: "Fornecedor Teste",
	telefone: "11999999999",
	fornecedor: 1,
} as Entidade;

const produto = {
	id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
	idempresa: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
	nome: "Farinha",
	descricao: "Farinha de trigo",
};

const cabecalho = {
	id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
	idempresa: fornecedor.idempresa,
	codigo: 1,
	idcotacao: null,
	idproposta: null,
	identidade: fornecedor.id,
	fornecedornome: fornecedor.nome,
	fornecedortelefone: "11999999999",
	valortotal: "20.00",
	status: "A",
	observacao: null,
	currenttimemillis: 1,
} as PedidoCompra;

describe("criarPedidoCompraService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			fornecedor,
		);
		vi.mocked(produtoRepository.buscarProdutoPorId).mockResolvedValue(
			produto as never,
		);
		vi.mocked(
			pedidoRepository.buscarProximoCodigoPedidoCompra,
		).mockResolvedValue(1);
		vi.mocked(pedidoRepository.criarPedidosCompraEmLote).mockResolvedValue([
			{ cabecalho, itens: [] },
		]);
		vi.mocked(
			pedidoRepository.listarItensPedidoCompraEnriquecidos,
		).mockResolvedValue([]);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as never,
		});
	});

	it("cria pedido a partir do fornecedor cadastrado", async () => {
		const resultado = await criarPedidoCompraService({
			idusuario: "usuario-1",
			idempresa: fornecedor.idempresa,
			identidade: fornecedor.id,
			itens: [
				{
					idproduto: produto.id,
					quantidade: "2",
					precounitario: "10",
				},
			],
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body?.fornecedornome).toBe("Fornecedor Teste");
		}
		expect(pedidoRepository.criarPedidosCompraEmLote).toHaveBeenCalledWith([
			expect.objectContaining({
				cabecalho: expect.objectContaining({
					identidade: fornecedor.id,
					fornecedornome: "Fornecedor Teste",
					valortotal: "20.00",
					idcotacao: null,
				}),
			}),
		]);
		expect(cotacaoService.criarCotacaoCompraService).not.toHaveBeenCalled();
	});

	it("cria cotação em rascunho quando marcado como cotação", async () => {
		vi.mocked(cotacaoService.criarCotacaoCompraService).mockResolvedValue({
			success: true,
			status: 201,
			body: {
				id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
				codigo: 3,
				titulo: "Cotação — Fornecedor Teste",
			} as never,
		});

		const resultado = await criarPedidoCompraService({
			idusuario: "usuario-1",
			idempresa: fornecedor.idempresa,
			identidade: fornecedor.id,
			comoCotacao: true,
			itens: [
				{
					idproduto: produto.id,
					quantidade: "1",
					precounitario: "10",
				},
			],
		});

		expect(resultado.success).toBe(true);
		expect(cotacaoService.criarCotacaoCompraService).toHaveBeenCalledTimes(1);
		expect(pedidoRepository.criarPedidosCompraEmLote).toHaveBeenCalledWith([
			expect.objectContaining({
				cabecalho: expect.objectContaining({
					idcotacao: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
				}),
			}),
		]);
	});

	it("rejeita entidade que não é fornecedor", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			...fornecedor,
			fornecedor: 0,
		});

		const resultado = await criarPedidoCompraService({
			idusuario: "usuario-1",
			idempresa: fornecedor.idempresa,
			identidade: fornecedor.id,
			itens: [
				{
					idproduto: produto.id,
					quantidade: "1",
					precounitario: "10",
				},
			],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(pedidoRepository.criarPedidosCompraEmLote).not.toHaveBeenCalled();
	});
});
