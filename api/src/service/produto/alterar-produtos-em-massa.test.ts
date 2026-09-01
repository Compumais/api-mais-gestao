import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as grupoGourmetRepository from "@/repositories/grupo-gourmet-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as unidadeMedidaRepository from "@/repositories/unidade-medida-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { alterarProdutosEmMassaService } from "./alterar-produtos-em-massa.js";
import { camposAlteracaoEmMassaProdutoSchema } from "@/util/campos-alteracao-em-massa-produto.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/grupo-gourmet-repositories");
vi.mock("@/repositories/produtos-repositories");
vi.mock("@/repositories/unidade-medida-repositories");
vi.mock("@/service/auditoria/criar-auditoria");

const EMPRESA_ID = "empresa-1";
const USUARIO_ID = "usuario-1";
const PRODUTO_ID = "prod-1";
const GRUPO_GOURMET_ID = "grupo-gourmet-1";

function produtoDaEmpresa(parcial?: { id?: string; idempresa?: string }) {
	return {
		id: parcial?.id ?? PRODUTO_ID,
		idempresa: parcial?.idempresa ?? EMPRESA_ID,
		nome: "Produto",
	} as never;
}

describe("alterarProdutosEmMassaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as never,
		});
	});

	it("persiste somente os campos enviados", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(produtosRepository.atualizarProdutosEmMassa).mockResolvedValue([
			produtoDaEmpresa(),
		]);

		const resultado = await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: {
				percentualmva: "12.50",
				cstpis: "01",
			},
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepository.atualizarProdutosEmMassa).toHaveBeenCalledWith(
			[PRODUTO_ID],
			{
				percentualmva: "12.50",
				cstpis: "01",
			},
		);
		const persistidos = vi.mocked(produtosRepository.atualizarProdutosEmMassa)
			.mock.calls[0]?.[1];
		expect(persistidos).not.toHaveProperty("preco");
		expect(persistidos).not.toHaveProperty("ncm");
		expect(persistidos).not.toHaveProperty("cstcofins");
		if (resultado.success && resultado.body) {
			expect(resultado.body.atualizados).toBe(1);
			expect(resultado.body.erros).toBe(0);
		}
	});

	it("rejeita produto de outra empresa", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa({ idempresa: "outra-empresa" }),
		]);

		const resultado = await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: { ncm: "22021000" },
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(produtosRepository.atualizarProdutosEmMassa).not.toHaveBeenCalled();
	});

	it("rejeita lista de produtos vazia com 400", async () => {
		const resultado = await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [],
			campos: { ncm: "22021000" },
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(produtosRepository.buscarProdutosPorIds).not.toHaveBeenCalled();
	});

	it("atualiza a sigla da unidade quando a unidade muda", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(produtosRepository.atualizarProdutosEmMassa).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(
			unidadeMedidaRepository.buscarUnidadeMedidaPorId,
		).mockResolvedValue({
			id: "un-1",
			idempresa: EMPRESA_ID,
			codigo: "KG",
		} as never);

		await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: { idunidademedida: "un-1" },
		});

		expect(produtosRepository.atualizarProdutosEmMassa).toHaveBeenCalledWith(
			[PRODUTO_ID],
			{
				idunidademedida: "un-1",
				unidademedida: "KG",
			},
		);
	});

	it("persiste idgrupogourmet e espizza", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(produtosRepository.atualizarProdutosEmMassa).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(grupoGourmetRepository.buscarGrupoGourmetPorId).mockResolvedValue(
			{
				id: GRUPO_GOURMET_ID,
				idempresa: EMPRESA_ID,
				nome: "Cozinha",
				codigo: "01",
				inativo: 0,
			} as never,
		);

		const resultado = await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: {
				idgrupogourmet: GRUPO_GOURMET_ID,
				espizza: 1,
			},
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepository.atualizarProdutosEmMassa).toHaveBeenCalledWith(
			[PRODUTO_ID],
			{
				idgrupogourmet: GRUPO_GOURMET_ID,
				espizza: 1,
			},
		);
	});

	it("limpa idgrupogourmet quando recebe null", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(produtosRepository.atualizarProdutosEmMassa).mockResolvedValue([
			produtoDaEmpresa(),
		]);

		await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: {
				idgrupogourmet: null,
			},
		});

		expect(produtosRepository.atualizarProdutosEmMassa).toHaveBeenCalledWith(
			[PRODUTO_ID],
			{
				idgrupogourmet: null,
			},
		);
		expect(grupoGourmetRepository.buscarGrupoGourmetPorId).not.toHaveBeenCalled();
	});

	it("normaliza idgrupogourmet none para null no schema", () => {
		const parsed = camposAlteracaoEmMassaProdutoSchema.parse({
			idgrupogourmet: "none",
		});

		expect(parsed.idgrupogourmet).toBeNull();
	});

	it("rejeita grupo gourmet de outra empresa", async () => {
		vi.mocked(produtosRepository.buscarProdutosPorIds).mockResolvedValue([
			produtoDaEmpresa(),
		]);
		vi.mocked(grupoGourmetRepository.buscarGrupoGourmetPorId).mockResolvedValue(
			{
				id: GRUPO_GOURMET_ID,
				idempresa: "outra-empresa",
				nome: "Cozinha",
				codigo: "01",
				inativo: 0,
			} as never,
		);

		const resultado = await alterarProdutosEmMassaService({
			idusuario: USUARIO_ID,
			idempresa: EMPRESA_ID,
			ids: [PRODUTO_ID],
			campos: {
				idgrupogourmet: GRUPO_GOURMET_ID,
			},
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(produtosRepository.atualizarProdutosEmMassa).not.toHaveBeenCalled();
	});
});
