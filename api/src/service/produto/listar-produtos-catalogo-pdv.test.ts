import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import { listarProdutosCatalogoPdvService } from "./listar-produtos-catalogo-pdv.js";

vi.mock("@/repositories/produtos-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("listarProdutosCatalogoPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna catálogo com tributação resolvida e paginação", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(produtosRepository.listarProdutosCatalogoPdv).mockResolvedValue({
			produtos: [
				{
					id: "p1",
					descricao: "Produto",
					preco: "10.00",
					unidademedida: "UN",
					idunidademedida: null,
					ean: null,
					codigo: 1,
					idgrupo: "g1",
					idgrupogourmet: null,
					espizza: 0,
					imagem: null,
					caminhoimagem: null,
					ncm: "22021000",
					cest: "0300100",
					cfop: "5102",
					cst: null,
					csosn: "102",
					origem: 0,
					aliquotaicms: null,
				},
			],
			total: 1,
		});

		const resultado = await listarProdutosCatalogoPdvService({
			idusuario: "u1",
			idempresa: "e1",
			page: 1,
			limit: 100,
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepository.listarProdutosCatalogoPdv).toHaveBeenCalledWith({
			idempresa: "e1",
			page: 1,
			limit: 100,
		});
		if (resultado.success && resultado.body) {
			expect(resultado.body.data[0]?.cfop).toBe("5102");
			expect(resultado.body.data[0]?.ncm).toBe("22021000");
			expect(resultado.body.data[0]?.csosn).toBe("102");
			expect(resultado.body.paginacao.total).toBe(1);
			expect(resultado.body.paginacao.totalPages).toBe(1);
		}
	});

	it("nega acesso quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarProdutosCatalogoPdvService({
			idusuario: "u1",
			idempresa: "e1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(produtosRepository.listarProdutosCatalogoPdv).not.toHaveBeenCalled();
	});
});
