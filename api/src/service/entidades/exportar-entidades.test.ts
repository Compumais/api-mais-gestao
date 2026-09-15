import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { exportarEntidadesService } from "./exportar-entidades.js";

vi.mock("@/repositories/entidade-repositories");

const entidadeMock: Entidade = {
	id: "entidade-1",
	nome: "=2+2",
	razaosocial: "Cliente LTDA",
	tipopessoa: 1,
	cnpjcpf: "12345678000199",
	inscricaoestadual: "123",
	rg: null,
	email: "cliente@example.com",
	telefone: "34999999999",
	endereco: "Rua A",
	numeroendereco: "10",
	complemento: null,
	bairro: "Centro",
	idcidade: null,
	idestado: null,
	cep: "38190000",
	fax: null,
	nascimento: "1990-05-15",
	idplanocontas: null,
	pais: "Brasil",
	cliente: 1,
	fornecedor: 0,
	transportador: 0,
	representante: 0,
	indiedest: 1,
	idempresa: "empresa-1",
	criadoem: "2026-01-10T12:00:00.000Z",
	atualizadoem: "2026-01-10T12:00:00.000Z",
};

describe("exportarEntidadesService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("nega acesso quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await exportarEntidadesService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			cliente: 1,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(
			entidadeRepository.listarTodasEntidadesParaExportacao,
		).not.toHaveBeenCalled();
	});

	it("recusa exportação sem cliente ou fornecedor", async () => {
		const resultado = await exportarEntidadesService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
	});

	it("gera CSV de clientes com BOM, cabeçalho e fórmula protegida", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.listarTodasEntidadesParaExportacao,
		).mockResolvedValue([entidadeMock]);

		const resultado = await exportarEntidadesService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			cliente: 1,
			q: "Cliente",
		});

		expect(
			entidadeRepository.listarTodasEntidadesParaExportacao,
		).toHaveBeenCalledWith({
			idempresa: "empresa-1",
			cliente: 1,
			q: "Cliente",
		});
		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			const csv = resultado.body.content.toString("utf-8");
			expect(csv.startsWith("\uFEFF")).toBe(true);
			expect(csv).toContain("Nome");
			expect(csv).toContain("Razão Social");
			expect(csv).toContain("'=2+2");
			expect(csv).toContain("Jurídica");
			expect(csv).toContain("1 — Contribuinte ICMS");
			expect(csv).toContain("15/05/1990");
			expect(resultado.body.filename).toBe("clientes.csv");
		}
	});

	it("gera CSV de fornecedores com o nome de arquivo correto", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.listarTodasEntidadesParaExportacao,
		).mockResolvedValue([]);

		const resultado = await exportarEntidadesService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			fornecedor: 1,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.filename).toBe("fornecedores.csv");
		}
	});
});
