import { beforeEach, describe, expect, it, vi } from "vitest";
import * as davRepository from "@/repositories/dav-repositories.js";
import * as davItemRepository from "@/repositories/dav-item-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as cfopRepository from "@/repositories/cfop-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as emitirNfe from "@/service/nfe-emissao/emitir-nfe-venda.js";
import { faturarDavNfeService } from "@/service/dav/faturar-dav-nfe.js";

vi.mock("@/repositories/dav-repositories.js");
vi.mock("@/repositories/dav-item-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js", () => ({
	buscarTipoDocumentoFinanceiroPorId: vi.fn(),
}));
vi.mock("@/service/nfe-emissao/emitir-nfe-venda.js");

describe("faturarDavNfeService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
	});

	it("deve bloquear pedido já faturado", async () => {
		vi.mocked(davRepository.buscarDavPorId).mockResolvedValue({
			id: "dav-1",
			idempresa: "emp-1",
			idnotafiscal: "nf-existente",
			idcliente: "cli-1",
		} as never);

		const resultado = await faturarDavNfeService({
			idusuario: "user-1",
			iddav: "dav-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(false);
	});

	it("deve faturar pedido válido e atualizar DAV", async () => {
		vi.mocked(davRepository.buscarDavPorId).mockResolvedValue({
			id: "dav-1",
			idempresa: "emp-1",
			idcliente: "cli-1",
			idnotafiscal: null,
		} as never);
		vi.mocked(davItemRepository.listarItensPorDav).mockResolvedValue([
			{
				id: "item-1",
				idproduto: "prod-1",
				quantidade: "2",
				preco: "50",
			},
		] as never);
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			descricao: "Produto teste",
			ncm: "12345678",
			idcfopsaidaexterna: "cfop-1",
			unidademedida: "UN",
			codigo: 1,
			origem: 0,
		} as never);
		vi.mocked(cfopRepository.buscarCfopPorId).mockResolvedValue({
			codigo: "5102",
		} as never);
		vi.mocked(emitirNfe.emitirNfeVendaService).mockResolvedValue({
			success: true,
			status: 200,
			body: { idnotafiscal: "nf-nova" },
		});
		vi.mocked(davRepository.atualizarDav).mockResolvedValue({} as never);

		const resultado = await faturarDavNfeService({
			idusuario: "user-1",
			iddav: "dav-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(true);
		expect(emitirNfe.emitirNfeVendaService).toHaveBeenCalled();
		expect(davRepository.atualizarDav).toHaveBeenCalledWith(
			"dav-1",
			expect.objectContaining({ idnotafiscal: "nf-nova" }),
		);
	});
});
