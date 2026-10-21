import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as unidadeMedidaRepository from "@/repositories/unidade-medida-repositories.js";
import { listarProdutosService } from "./listar-produtos.js";

vi.mock("@/repositories/produtos-repositories");
vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/unidade-medida-repositories");

describe("listarProdutosService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("repassa filtro tipo=S ao repositório", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosPorEmpresa).mockResolvedValue({
			produtos: [
				{
					id: "svc-1",
					idempresa: "empresa-1",
					nome: "Consultoria",
					tipo: "S",
				} as never,
			],
			total: 1,
		});

		const resultado = await listarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			tipo: "S",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepository.listarProdutosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresas: ["empresa-1"],
				tipo: "S",
				page: 1,
				limit: 10,
			}),
		);
		if (resultado.success && resultado.body) {
			expect(resultado.body.data).toHaveLength(1);
			expect(resultado.body.data[0]?.tipo).toBe("S");
		}
	});

	it("repassa filtro tipo=P sem misturar serviços", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosPorEmpresa).mockResolvedValue({
			produtos: [
				{
					id: "prod-1",
					idempresa: "empresa-1",
					nome: "Produto",
					tipo: "P",
				} as never,
			],
			total: 1,
		});

		await listarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			tipo: "P",
		});

		expect(produtosRepository.listarProdutosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({ tipo: "P" }),
		);
	});

	it("repassa filtro somenteDivergencia ao repositório", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosPorEmpresa).mockResolvedValue({
			produtos: [
				{
					id: "prod-1",
					idempresa: "empresa-1",
					nome: "Produto",
					tipo: "P",
					quantidade: "10",
					quantidadefiscal: "8",
					divergencia: "2.000000",
					possuiSaldo: true,
				} as never,
			],
			total: 1,
		});

		await listarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			tipo: "P",
			somenteDivergencia: true,
		});

		expect(produtosRepository.listarProdutosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({ somenteDivergencia: true }),
		);
	});

	it("preenche a sigla KG quando o produto só tem o id da unidade", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosPorEmpresa).mockResolvedValue({
			produtos: [
				{
					id: "prod-kg",
					idempresa: "empresa-1",
					nome: "Queijo",
					unidademedida: null,
					idunidademedida: "a0000001-0000-4000-8000-000000000002",
				} as never,
			],
			total: 1,
		});
		vi.mocked(
			unidadeMedidaRepository.listarUnidadesMedidaPorEmpresa,
		).mockResolvedValue([
			{
				id: "a0000001-0000-4000-8000-000000000002",
				codigo: "KG",
				nome: "Quilograma",
				idempresa: null,
			},
		]);

		const resultado = await listarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.data[0]?.unidademedida).toBe("KG");
		}
	});

	it("repassa o produto pai ao listar variações", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosPorEmpresa).mockResolvedValue({
			produtos: [],
			total: 0,
		});

		await listarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			idprodutopai: "pai-1",
		});

		expect(produtosRepository.listarProdutosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({ idprodutopai: "pai-1" }),
		);
	});
});
