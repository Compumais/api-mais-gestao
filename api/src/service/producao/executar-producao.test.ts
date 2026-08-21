import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORIGEM_PRODUCAO } from "@/model/registro-producao-model.js";
import * as entidadeRepo from "@/repositories/entidade-repositories.js";
import * as fichaRepo from "@/repositories/ficha-producao-repositories.js";
import * as custoRepo from "@/repositories/custo-produto-repositories.js";
import * as produtoRepo from "@/repositories/produtos-repositories.js";
import * as registroRepo from "@/repositories/registro-producao-repositories.js";
import * as saldoRepo from "@/repositories/saldo-estoque-repositories.js";
import * as registrarMovimento from "@/service/estoque/registrar-movimento-estoque.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import {
	calcularConsumosProducao,
	executarProducaoService,
	resolverCustoUnitarioProduto,
} from "./executar-producao.js";
import { garantirProducaoNaVendaService } from "./garantir-producao-na-venda.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/ficha-producao-repositories.js");
vi.mock("@/repositories/custo-produto-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/registro-producao-repositories.js");
vi.mock("@/repositories/saldo-estoque-repositories.js");
vi.mock("@/service/estoque/registrar-movimento-estoque.js");

describe("calcularConsumosProducao", () => {
	it("proporcionaliza consumo pela quantidade a produzir", () => {
		const consumos = calcularConsumosProducao(
			[
				{ idproduto: "farinha", quantidade: "0.500000" },
				{ idproduto: "acucar", quantidade: "0.100000" },
			],
			100,
		);

		expect(consumos).toEqual([
			{ idproduto: "farinha", quantidade: 50 },
			{ idproduto: "acucar", quantidade: 10 },
		]);
	});
});

describe("resolverCustoUnitarioProduto", () => {
	it("prioriza custoaquisicao", () => {
		expect(
			resolverCustoUnitarioProduto({
				custoaquisicao: "2.50",
				customedioinicial: "1.00",
				precoultimacompra: "0.50",
			}),
		).toBe(2.5);
	});
});

describe("executarProducaoService", () => {
	const ficha = {
		id: "ficha-1",
		idempresa: "emp-1",
		idprodutoacabado: "bolo",
		ativo: 1,
		permiteproducaomassa: 1,
		producaonavenda: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fichaRepo.buscarFichaProducaoPorId).mockResolvedValue(
			ficha as never,
		);
		vi.mocked(entidadeRepo.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(fichaRepo.listarItensFichaProducao).mockResolvedValue([
			{ idproduto: "farinha", quantidade: "0.500000" },
			{ idproduto: "acucar", quantidade: "0.100000" },
		] as never);
		vi.mocked(produtoRepo.buscarProdutoPorId).mockImplementation(
			async (id: string) => {
				if (id === "farinha") {
					return {
						id: "farinha",
						codigo: 1,
						nome: "Farinha",
						custoaquisicao: "2.00",
					} as never;
				}
				if (id === "acucar") {
					return {
						id: "acucar",
						codigo: 2,
						nome: "Açúcar",
						custoaquisicao: "3.00",
					} as never;
				}
				if (id === "bolo") {
					return {
						id: "bolo",
						codigo: 3,
						nome: "Bolo",
						customedioinicial: "0",
					} as never;
				}
				return undefined;
			},
		);
		vi.mocked(saldoRepo.buscarSaldoEstoquePorCodigoProduto).mockResolvedValue({
			quantidade: "100",
			quantidadefiscal: "100",
		} as never);
		vi.mocked(registrarMovimento.registrarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);
		vi.mocked(registroRepo.criarRegistroProducaoComItens).mockResolvedValue({
			registro: { id: "reg-1" },
			itens: [],
		} as never);
		vi.mocked(custoRepo.criarCustoProduto).mockResolvedValue({} as never);
		vi.mocked(produtoRepo.atualizarProduto).mockResolvedValue({} as never);
	});

	it("bloqueia quando saldo de insumo é insuficiente", async () => {
		vi.mocked(saldoRepo.buscarSaldoEstoquePorCodigoProduto).mockResolvedValue({
			quantidade: "1",
			quantidadefiscal: "1",
		} as never);

		const resultado = await executarProducaoService({
			idficha: "ficha-1",
			quantidade: "100",
			idusuario: "user-1",
			origem: ORIGEM_PRODUCAO.MASSA,
			tipoestoque: TIPO_ESTOQUE.AMBOS,
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toMatch(/insuficiente/i);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
	});

	it("calcula custo unitário do acabado a partir dos insumos", async () => {
		const resultado = await executarProducaoService({
			idficha: "ficha-1",
			quantidade: "10",
			idusuario: "user-1",
			origem: ORIGEM_PRODUCAO.MASSA,
			tipoestoque: TIPO_ESTOQUE.AMBOS,
		});

		expect(resultado.success).toBe(true);
		// Farinha 5 * 2 = 10; Açúcar 1 * 3 = 3; total 13 / 10 = 1.3
		expect(resultado.body?.custototal).toBe("13.0000000000");
		expect(resultado.body?.custounitario).toBe("1.3000000000");
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledTimes(3);
	});

	it("rejeita produção em massa quando flag não está ativa", async () => {
		vi.mocked(fichaRepo.buscarFichaProducaoPorId).mockResolvedValue({
			...ficha,
			permiteproducaomassa: 0,
		} as never);

		const resultado = await executarProducaoService({
			idficha: "ficha-1",
			quantidade: "1",
			idusuario: "user-1",
			origem: ORIGEM_PRODUCAO.MASSA,
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toMatch(/não permite produção em massa/i);
	});
});

describe("garantirProducaoNaVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("é idempotente para o mesmo idoriginal/produto/tipoestoque", async () => {
		vi.mocked(fichaRepo.buscarFichaProducaoAtivaPorProduto).mockResolvedValue({
			id: "ficha-1",
			producaonavenda: 1,
		} as never);
		vi.mocked(registroRepo.buscarRegistroProducaoVendaAtivo).mockResolvedValue({
			id: "reg-existente",
			idfichaproducao: "ficha-1",
			idprodutoacabado: "bolo",
			origem: 1,
			quantidadeproduzida: "2",
			custototal: "10",
			custounitario: "5",
			tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			idoriginal: "venda-1",
		} as never);

		const resultado = await garantirProducaoNaVendaService({
			idempresa: "emp-1",
			idproduto: "bolo",
			quantidade: "2",
			idoriginal: "venda-1",
			tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.jaExistia).toBe(true);
		expect(resultado.body?.executada).toBe(false);
	});

	it("não executa quando ficha não tem produção na venda", async () => {
		vi.mocked(fichaRepo.buscarFichaProducaoAtivaPorProduto).mockResolvedValue({
			id: "ficha-1",
			producaonavenda: 0,
		} as never);

		const resultado = await garantirProducaoNaVendaService({
			idempresa: "emp-1",
			idproduto: "bolo",
			quantidade: "2",
			idoriginal: "venda-1",
			tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			idusuario: "user-1",
		});

		expect(resultado.body).toEqual({ executada: false, jaExistia: false });
	});
});
