import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarProdutoParaNf } from "./vincular-ou-criar-produto.js";

vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/proximo-codigo-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");

import * as produtosRepositories from "@/repositories/produtos-repositories.js";
import * as proximoCodigo from "@/repositories/proximo-codigo-repositories.js";

describe("criarProdutoParaNf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(produtosRepositories.criarProduto).mockImplementation(
			async (dados) =>
				({
					id: dados.id,
					idempresa: dados.idempresa,
					nome: dados.nome,
					descricao: dados.descricao,
					codigo: dados.codigo ?? null,
				}) as never,
		);
	});

	it("usa o próximo código da empresa quando nenhum código interno é informado", async () => {
		vi.mocked(proximoCodigo.buscarProximoCodigoProduto).mockResolvedValue(42);

		const produto = await criarProdutoParaNf({
			idempresa: "empresa-1",
			descricaoproduto: "Produto novo",
		});

		expect(proximoCodigo.buscarProximoCodigoProduto).toHaveBeenCalledWith(
			"empresa-1",
		);
		expect(produtosRepositories.criarProduto).toHaveBeenCalledWith(
			expect.objectContaining({ codigo: 42 }),
		);
		expect(produto?.codigo).toBe(42);
	});

	it("preserva o código interno informado", async () => {
		const produto = await criarProdutoParaNf({
			idempresa: "empresa-1",
			descricaoproduto: "Produto novo",
			codigoproduto: 7,
		});

		expect(proximoCodigo.buscarProximoCodigoProduto).not.toHaveBeenCalled();
		expect(produtosRepositories.criarProduto).toHaveBeenCalledWith(
			expect.objectContaining({ codigo: 7 }),
		);
		expect(produto?.codigo).toBe(7);
	});

	it("passa observacoes para criarProduto", async () => {
		await criarProdutoParaNf({
			idempresa: "empresa-1",
			descricaoproduto: "Produto com obs",
			observacoes: "cadastro incluido automaticamente atraves da nf n° 123",
		});

		expect(produtosRepositories.criarProduto).toHaveBeenCalledWith(
			expect.objectContaining({
				observacoes: "cadastro incluido automaticamente atraves da nf n° 123",
			}),
		);
	});
});
