import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import { listarProdutosService } from "./listar-produtos.js";

vi.mock("@/repositories/produtos-repositories");
vi.mock("@/repositories/entidade-repositories");

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
});
