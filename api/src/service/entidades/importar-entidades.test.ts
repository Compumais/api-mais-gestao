import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { CABECALHO_TEMPLATE_ENTIDADES } from "@/util/entidades-importacao.js";
import { importarEntidadesService } from "./importar-entidades.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/service/auditoria/criar-auditoria");

function csv(linhas: string[][]): string {
	return `\uFEFF${linhas.map((linha) => linha.join(";")).join("\n")}`;
}

describe("importarEntidadesService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: null,
		} as never);
	});

	it("nega acesso quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await importarEntidadesService({
			idempresa: "empresa-1",
			idusuario: "usuario-1",
			formato: "csv",
			conteudo: "Nome;CNPJ/CPF\nAna;39053344705",
			tipo: "cliente",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(
			entidadeRepository.persistirImportacaoEntidades,
		).not.toHaveBeenCalled();
	});

	it("cria cliente novo e atualiza existente pelo CNPJ/CPF", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.listarDocumentosEntidadesEmpresa,
		).mockResolvedValue([{ id: "entidade-1", cnpjcpf: "390.533.447-05" }]);
		vi.mocked(
			entidadeRepository.persistirImportacaoEntidades,
		).mockResolvedValue({
			criados: [{ id: "novo-1" }],
			atualizados: [{ id: "entidade-1" }],
		} as never);

		const resultado = await importarEntidadesService({
			idempresa: "empresa-1",
			idusuario: "usuario-1",
			formato: "csv",
			tipo: "cliente",
			conteudo: csv([
				[...CABECALHO_TEMPLATE_ENTIDADES],
				[
					"Maria Souza",
					"",
					"39053344705",
					"",
					"Física",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				],
				[
					"Nova Cliente",
					"",
					"12345678901",
					"",
					"Física",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				],
			]),
		});

		expect(resultado.success).toBe(true);
		expect(
			entidadeRepository.persistirImportacaoEntidades,
		).toHaveBeenCalledWith({
			criar: [
				expect.objectContaining({
					nome: "Nova Cliente",
					cnpjcpf: "12345678901",
					cliente: 1,
					fornecedor: 0,
				}),
			],
			atualizar: [
				expect.objectContaining({
					id: "entidade-1",
					dados: expect.objectContaining({
						nome: "Maria Souza",
						cliente: 1,
					}),
				}),
			],
		});
		if (resultado.success && resultado.body) {
			expect(resultado.body.totalCriados).toBe(1);
			expect(resultado.body.totalAtualizados).toBe(1);
		}
	});
});
