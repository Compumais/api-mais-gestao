import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarPedidoCardapioPublicoService } from "./criar-pedido-cardapio-publico.js";

vi.mock("@/repositories/cardapio-delivery-repositories.js", () => ({
	buscarCardapioDeliveryPorSlug: vi.fn(),
	buscarPedidoCardapioPorClientOrderId: vi.fn(),
	buscarProdutosCardapioPorIds: vi.fn(),
	criarPedidoCardapioDelivery: vi.fn(),
	protocoloCardapioExiste: vi.fn(),
}));

vi.mock("@/repositories/tipo-documento-financeiro-repositories.js", () => ({
	buscarTipoDocumentoFinanceiroPorId: vi.fn(),
}));

import * as repo from "@/repositories/cardapio-delivery-repositories.js";
import * as meios from "@/repositories/tipo-documento-financeiro-repositories.js";

const cardapio = {
	id: "c1",
	idempresa: "e1",
	slug: "pizzaria",
	ativo: 1,
	habilitadelivery: 1,
	habilitaretirada: 1,
	taxaentregapadrao: "8",
	pedidominimo: "0",
	bairrosentrega: [{ nome: "Centro", taxa: 5 }],
	horario: { ativo: 0, modo: "simples", timezone: "America/Sao_Paulo" },
	camposfinalizacao: [
		{
			id: "modalidade",
			tipo: "modalidade",
			rotulo: "Tipo",
			obrigatorio: 1,
			ordem: 0,
		},
		{
			id: "endereco",
			tipo: "endereco",
			rotulo: "Endereço",
			obrigatorio: 1,
			ordem: 1,
			condicao: { campoid: "modalidade", valor: "delivery" },
		},
		{
			id: "pagamento",
			tipo: "pagamento",
			rotulo: "Pagamento",
			obrigatorio: 1,
			ordem: 2,
		},
	],
	idmeiospagamento: ["pix1"],
	chavepix: "chave@pix",
};

describe("criarPedidoCardapioPublicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(repo.buscarCardapioDeliveryPorSlug).mockResolvedValue(
			cardapio as never,
		);
		vi.mocked(repo.buscarPedidoCardapioPorClientOrderId).mockResolvedValue(
			undefined,
		);
		vi.mocked(repo.protocoloCardapioExiste).mockResolvedValue(false);
		vi.mocked(meios.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue({
			id: "pix1",
			idempresa: "e1",
			descricao: "PIX",
			inativo: 0,
		} as never);
		vi.mocked(repo.buscarProdutosCardapioPorIds).mockResolvedValue([
			{
				id: "p1",
				descricao: "Calabresa",
				nome: "Calabresa",
				preco: "40",
				espizza: 1,
				idgrupogourmet: "g1",
				codigo: 1,
				ean: null,
			},
			{
				id: "p2",
				descricao: "Frango",
				nome: "Frango",
				preco: "50",
				espizza: 1,
				idgrupogourmet: "g1",
				codigo: 2,
				ean: null,
			},
		]);
		vi.mocked(repo.criarPedidoCardapioDelivery).mockImplementation(
			async (dados) =>
				({
					...dados,
					id: "pedido1",
					status: "pendente",
				}) as never,
		);
	});

	it("recalcula pizza meio a meio e taxa do bairro", async () => {
		const resultado = await criarPedidoCardapioPublicoService({
			slug: "pizzaria",
			clientorderid: "11111111-1111-1111-1111-111111111111",
			nomecliente: "Ana",
			telefone: "11999999999",
			respostas: [
				{ campoid: "modalidade", valor: "delivery" },
				{ campoid: "pagamento", valor: "pix1" },
				{ campoid: "endereco", valor: "Rua A" },
				{ campoid: "numero", valor: "10" },
				{ campoid: "bairro", valor: "Centro" },
			],
			itens: [{ idproduto: "p1", quantidade: 1, idprodutomeio: "p2" }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.subtotal).toBe(50);
		expect(resultado.body?.valorentrega).toBe(5);
		expect(resultado.body?.total).toBe(55);
		expect(repo.criarPedidoCardapioDelivery).toHaveBeenCalled();
	});

	it("rejeita pedido abaixo do mínimo", async () => {
		vi.mocked(repo.buscarCardapioDeliveryPorSlug).mockResolvedValue({
			...cardapio,
			pedidominimo: "80",
		} as never);
		const resultado = await criarPedidoCardapioPublicoService({
			slug: "pizzaria",
			clientorderid: "22222222-2222-2222-2222-222222222222",
			nomecliente: "Ana",
			telefone: "11999999999",
			respostas: [
				{ campoid: "modalidade", valor: "retirada" },
				{ campoid: "pagamento", valor: "pix1" },
			],
			itens: [{ idproduto: "p1", quantidade: 1 }],
		});
		expect(resultado.success).toBe(false);
		if (resultado.success) return;
		expect(resultado.error).toMatch(/mínimo/i);
	});

	it("zera taxa na retirada", async () => {
		const resultado = await criarPedidoCardapioPublicoService({
			slug: "pizzaria",
			clientorderid: "33333333-3333-3333-3333-333333333333",
			nomecliente: "Ana",
			telefone: "11999999999",
			respostas: [
				{ campoid: "modalidade", valor: "retirada" },
				{ campoid: "pagamento", valor: "pix1" },
			],
			itens: [{ idproduto: "p1", quantidade: 1 }],
		});
		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.valorentrega).toBe(0);
		expect(resultado.body?.total).toBe(40);
	});
});
