import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as estoqueGestaoRepository from "@/repositories/estoque-gestao-repositories.js";
import { listarSaldosEstoqueGestaoService } from "./listar-estoque-gestao.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/estoque-gestao-repositories");

const EMPRESA_ID = "11111111-1111-4111-8111-111111111111";
const USUARIO_ID = "22222222-2222-4222-8222-222222222222";
const PRODUTO_ID = "33333333-3333-4333-8333-333333333333";

describe("listarSaldosEstoqueGestaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
	});

	it("lista produtos sem registro de saldo com quantidades zeradas", async () => {
		vi.mocked(
			estoqueGestaoRepository.listarEstoqueGestaoPorProdutos,
		).mockResolvedValue({
			itens: [
				{
					idsaldo: null,
					idproduto: PRODUTO_ID,
					idempresa: EMPRESA_ID,
					codigoproduto: "42",
					nomeproduto: "Cachaça 700ml",
					quantidade: null,
					quantidadefiscal: null,
					ncm: "22084000",
					unidademedida: "UN",
				},
			],
			total: 1,
		});

		const resultado = await listarSaldosEstoqueGestaoService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			page: 1,
			limit: 20,
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success || !resultado.body) {
			throw new Error("Resposta inesperada");
		}

		expect(resultado.body.data).toEqual([
			{
				id: null,
				idproduto: PRODUTO_ID,
				idempresa: EMPRESA_ID,
				codigoproduto: "42",
				nomeproduto: "Cachaça 700ml",
				quantidade: "0",
				quantidadefiscal: "0",
				divergencia: "0.000000",
				ncm: "22084000",
				unidademedida: "UN",
				possuiSaldo: false,
			},
		]);
	});

	it("calcula divergência entre operacional e fiscal", async () => {
		vi.mocked(
			estoqueGestaoRepository.listarEstoqueGestaoPorProdutos,
		).mockResolvedValue({
			itens: [
				{
					idsaldo: 10,
					idproduto: PRODUTO_ID,
					idempresa: EMPRESA_ID,
					codigoproduto: "42",
					nomeproduto: "Cachaça 700ml",
					quantidade: "12.000000",
					quantidadefiscal: "10.000000",
					ncm: "22084000",
					unidademedida: "UN",
				},
			],
			total: 1,
		});

		const resultado = await listarSaldosEstoqueGestaoService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			somenteDivergencia: true,
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success || !resultado.body) {
			throw new Error("Resposta inesperada");
		}

		expect(resultado.body.data[0]?.divergencia).toBe("2.000000");
		expect(resultado.body.data[0]?.possuiSaldo).toBe(true);
		expect(
			estoqueGestaoRepository.listarEstoqueGestaoPorProdutos,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				somenteDivergencia: true,
			}),
		);
	});
});
