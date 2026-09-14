import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as relatorioRepository from "@/repositories/relatorios-produtos-repositories.js";
import { consultarRelatorioProdutosService } from "./consultar-relatorio-produtos.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/relatorios-produtos-repositories");

describe("consultarRelatorioProdutosService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("repassa situacao=inativo sem converter para texto SQL", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			relatorioRepository.consultarRelatorioProdutosDados,
		).mockResolvedValue({
			data: [
				{
					codigo: 1,
					nome: "Produto inativo",
					situacao: "Inativo",
				},
			],
			total: 1,
			resumo: { total: 1, inativos: 1 },
		});

		const resultado = await consultarRelatorioProdutosService({
			idusuario: "usuario-1",
			idempresa: "a365c155-3c19-4e60-9d88-85edf831af48",
			tipo: "cadastro",
			situacao: "inativo",
			page: 1,
			limit: 20,
		});

		expect(resultado.success).toBe(true);
		expect(
			relatorioRepository.consultarRelatorioProdutosDados,
		).toHaveBeenCalledWith(
			"cadastro",
			expect.objectContaining({
				situacao: "inativo",
				page: 1,
				limit: 20,
			}),
		);
		if (resultado.success && resultado.body) {
			expect(resultado.body.data[0]?.situacao).toBe("Inativo");
		}
	});
});
