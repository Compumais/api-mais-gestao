import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as verificarPermissaoModule from "@/util/verificar-permissao.js";
import { importarPlanoContasService } from "./importar-plano-contas.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/plano-contas-repositories");
vi.mock("@/service/auditoria/criar-auditoria");
vi.mock("@/util/verificar-permissao", () => ({
	verificarPermissao: vi.fn(),
}));

const CSV_VALIDO = [
	"Código;Descrição;Tipo;Ativo",
	"1;Receitas;E;Sim",
	"1 1;Vendas;E;Sim",
	"2;Despesas;S;Sim",
].join("\n");

const CSV_COM_ERROS = [
	"Código;Descrição;Tipo;Ativo",
	"1;Receitas;E;Sim",
	"1;Duplicado;E;Sim",
].join("\n");

describe("importarPlanoContasService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			planoContasRepository.buscarVinculosPlanoContasPorEmpresa,
		).mockResolvedValue([]);
		vi.mocked(
			planoContasRepository.substituirPlanoContasPorEmpresa,
		).mockResolvedValue({ excluidos: 5, inseridos: 3 });
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue(
			// biome-ignore lint/suspicious/noExplicitAny: mock simplificado de auditoria
			{} as any,
		);
	});

	it("deve importar plano de contas com sucesso substituindo o plano atual", async () => {
		const resultado = await importarPlanoContasService({
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			formato: "csv",
			conteudo: CSV_VALIDO,
			nomeArquivo: "plano.csv",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual({
				totalImportadas: 3,
				totalRemovidas: 5,
			});
		}

		const [idempresa, dados] = vi.mocked(
			planoContasRepository.substituirPlanoContasPorEmpresa,
		).mock.calls[0] as [
			string,
			{ codigo: string; idplanocontas: string | null; id: string }[],
		];

		expect(idempresa).toBe("empresa-123");
		expect(dados).toHaveLength(3);

		const contaPai = dados.find((conta) => conta.codigo === "1");
		const contaFilha = dados.find((conta) => conta.codigo === "1 1");

		expect(contaPai?.idplanocontas).toBeNull();
		expect(contaFilha?.idplanocontas).toBe(contaPai?.id);

		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
	});

	it("deve retornar 403 quando usuário não tem permissão", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			false,
		);

		const resultado = await importarPlanoContasService({
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			roles: ["user"],
			formato: "csv",
			conteudo: CSV_VALIDO,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(
			planoContasRepository.substituirPlanoContasPorEmpresa,
		).not.toHaveBeenCalled();
	});

	it("deve retornar 400 quando o arquivo possui erros de validação", async () => {
		const resultado = await importarPlanoContasService({
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			formato: "csv",
			conteudo: CSV_COM_ERROS,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.code).toBe("PLANO_CONTAS_IMPORTACAO_ERROS_VALIDACAO");
		}
		expect(
			planoContasRepository.substituirPlanoContasPorEmpresa,
		).not.toHaveBeenCalled();
	});

	it("deve retornar 409 quando existem vínculos com o plano atual", async () => {
		vi.mocked(
			planoContasRepository.buscarVinculosPlanoContasPorEmpresa,
		).mockResolvedValue([{ tabela: "Produtos", quantidade: 2 }]);

		const resultado = await importarPlanoContasService({
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			formato: "csv",
			conteudo: CSV_VALIDO,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.code).toBe("PLANO_CONTAS_IMPORTACAO_COM_VINCULOS");
			expect(resultado.error).toContain("Produtos: 2");
		}
		expect(
			planoContasRepository.substituirPlanoContasPorEmpresa,
		).not.toHaveBeenCalled();
	});

	it("deve retornar 400 quando a extensão do arquivo não corresponde ao formato", async () => {
		const resultado = await importarPlanoContasService({
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			formato: "csv",
			conteudo: CSV_VALIDO,
			nomeArquivo: "plano.xlsx",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.code).toBe("PLANO_CONTAS_IMPORTACAO_EXTENSAO_INVALIDA");
		}
	});
});
