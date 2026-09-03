import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvItem } from "@/model/venda-pdv-item-model.js";
import * as auditoriaRepository from "@/repositories/auditoria-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as vendaPdvItemRepository from "@/repositories/venda-pdv-item-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { criarVendaPdvItemService } from "./criar-venda-pdv-item.js";

vi.mock("@/repositories/auditoria-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/venda-pdv-item-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

const itemBase: VendaPdvItem = {
	id: "item-local-1",
	idempresa: "emp-1",
	idvenda: "venda-1",
	idproduto: "produto-1",
	descricao: "Produto",
	quantidade: "1.000",
	precounitario: "10.000",
	precototal: "10.000",
	precopromocao: "0.000",
	precoalterado: "0.000",
	taxaservico: 0,
};

const dadosItem = { ...itemBase };

describe("criarVendaPdvItemService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			vendaPdvItemRepository.criarOuBuscarVendaPdvItem,
		).mockResolvedValue({
			registro: itemBase,
			criado: false,
		});
		vi.mocked(auditoriaRepository.buscarAuditoriaPorRecurso).mockResolvedValue(
			undefined,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: { id: "auditoria-1" },
		} as never);
	});

	it("aceita retry idempotente e repara a auditoria ausente", async () => {
		const resultado = await criarVendaPdvItemService({
			dadosVendaPdvItem: dadosItem,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(itemBase);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(vendaPdvItemRepository.excluirVendaPdvItem).not.toHaveBeenCalled();
	});

	it("rejeita colisão da identidade local com outra venda", async () => {
		vi.mocked(
			vendaPdvItemRepository.criarOuBuscarVendaPdvItem,
		).mockResolvedValue({
			registro: { ...itemBase, idvenda: "venda-2" },
			criado: false,
		});

		const resultado = await criarVendaPdvItemService({
			dadosVendaPdvItem: dadosItem,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(resultado.error).toBe(
			"Identidade local do item já utilizada em outra venda",
		);
		expect(
			auditoriaRepository.buscarAuditoriaPorRecurso,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});
});
