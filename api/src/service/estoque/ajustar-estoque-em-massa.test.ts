import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as saldoRepository from "@/repositories/saldo-estoque-repositories.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import {
	ajustarEstoqueEmMassaService,
	TIPO_OPERACAO_AJUSTE,
} from "./ajustar-estoque-em-massa.js";
import * as registrarMovimento from "./registrar-movimento-estoque.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/saldo-estoque-repositories.js");
vi.mock("./registrar-movimento-estoque.js");
vi.mock("uuid", () => ({ v4: () => "ajuste-uuid-1" }));

describe("ajustarEstoqueEmMassaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			codigo: 10,
			nome: "Produto A",
		} as never);
		vi.mocked(registrarMovimento.registrarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);
	});

	it("registra entrada em ambos", async () => {
		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipooperacao: TIPO_OPERACAO_AJUSTE.ENTRADA,
			tipoestoque: TIPO_ESTOQUE.AMBOS,
			itens: [{ idproduto: "prod-1", quantidade: "5" }],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.movimentosRegistrados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "entrada",
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				quantidade: "5.000000",
				idoriginal: "ajuste-uuid-1",
			}),
		);
	});

	it("registra saída só operacional", async () => {
		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipooperacao: TIPO_OPERACAO_AJUSTE.SAIDA,
			tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			itens: [{ idproduto: "prod-1", quantidade: "2" }],
		});

		expect(resultado.success).toBe(true);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "saida",
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			}),
		);
	});

	it("contagem gera delta para o saldo alvo", async () => {
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			quantidade: "10",
			quantidadefiscal: "10",
		} as never);

		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipooperacao: TIPO_OPERACAO_AJUSTE.CONTAGEM,
			tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			itens: [{ idproduto: "prod-1", quantidade: "7" }],
		});

		expect(resultado.success).toBe(true);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "saida",
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
				quantidade: "3.000000",
			}),
		);
	});

	it("contagem em ambos com saldos diferentes ajusta cada lado", async () => {
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			quantidade: "10",
			quantidadefiscal: "8",
		} as never);

		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipooperacao: TIPO_OPERACAO_AJUSTE.CONTAGEM,
			tipoestoque: TIPO_ESTOQUE.AMBOS,
			itens: [{ idproduto: "prod-1", quantidade: "10" }],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.movimentosRegistrados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "entrada",
				tipoestoque: TIPO_ESTOQUE.FISCAL,
				quantidade: "2.000000",
			}),
		);
	});

	it("ignora contagem quando saldo já confere", async () => {
		vi.mocked(
			saldoRepository.buscarSaldoEstoquePorCodigoProduto,
		).mockResolvedValue({
			quantidade: "5",
			quantidadefiscal: "5",
		} as never);

		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipooperacao: TIPO_OPERACAO_AJUSTE.CONTAGEM,
			tipoestoque: TIPO_ESTOQUE.AMBOS,
			itens: [{ idproduto: "prod-1", quantidade: "5" }],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.movimentosRegistrados).toBe(0);
		expect(resultado.body?.itensIgnorados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
	});
});
