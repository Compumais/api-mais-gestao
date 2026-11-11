import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarCustosNfService } from "./registrar-custos-nf.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/custo-produto-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as produtosRepositories from "@/repositories/produtos-repositories.js";
import * as custoRepositories from "@/repositories/custo-produto-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";

describe("registrarCustosNfService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
		} as never);
	});

	it("registra custos e atualiza produto corretamente", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "empresa-1",
			custoaquisicao: "20.00",
			customedioinicial: "20.00",
		} as never);

		vi.mocked(custoRepositories.registrarCustosNfEmTransacao).mockImplementation(
			async (custos, atualizacoes) => {
				return custos.map((c) => ({
					...c,
					datahora: new Date(c.datahora),
					currenttimemillis: c.currenttimemillis ?? null,
				})) as never;
			},
		);

		const resultado = await registrarCustosNfService({
			idusuario: "user-1",
			idempresa: "empresa-1",
			idnotafiscal: "nf-100",
			itens: [
				{
					idproduto: "prod-1",
					precocompra: "25.00",
					custo: "25.00",
					ipi: "2.50",
					icmsst: "1.00",
					fretesegurooutrasdesp: "3.00",
				},
			],
		});

		expect(resultado.success).toBe(true);
		expect(custoRepositories.registrarCustosNfEmTransacao).toHaveBeenCalledWith(
			[
				expect.objectContaining({
					idproduto: "prod-1",
					idnotafiscal: "nf-100",
					precocompra: "25.00",
					custo: "25.00",
					custoaquisicao: "25.00",
					ipi: "2.50",
					icmsst: "1.00",
					fretesegurooutrasdesp: "3.00",
					origem: 0,
					status: 1,
				}),
			],
			[
				expect.objectContaining({
					id: "prod-1",
					dados: expect.objectContaining({
						precoultimacompra: "25.00",
						custoaquisicao: "25.00",
						origemcusto: 0,
					}),
				}),
			],
		);
	});

	it("retorna 400 se a lista de itens for vazia", async () => {
		const resultado = await registrarCustosNfService({
			idusuario: "user-1",
			idempresa: "empresa-1",
			idnotafiscal: "nf-100",
			itens: [],
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});

	it("retorna 403 se usuario nao pertencer a empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await registrarCustosNfService({
			idusuario: "user-1",
			idempresa: "empresa-1",
			idnotafiscal: "nf-100",
			itens: [{ idproduto: "prod-1", precocompra: "10.00" }],
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
	});
});
