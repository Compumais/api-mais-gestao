import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configRepositories from "@/repositories/configuracao-ordem-servico-repositories.js";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as tipoRepositories from "@/repositories/tipo-ordem-servico-evento-repositories.js";
import { atualizarConfiguracaoOrdemServicoService } from "@/service/ordem-servico/configuracao/gerenciar-configuracao-ordem-servico.js";
import * as helpers from "@/service/ordem-servico/ordem-servico-helpers.js";
import { atualizarTipoOrdemServicoEventoService } from "@/service/ordem-servico/tipo-evento/gerenciar-tipos-ordem-servico-evento.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/configuracao-ordem-servico-repositories.js");
vi.mock("@/repositories/tipo-ordem-servico-evento-repositories.js");
vi.mock("@/repositories/ordem-servico-evento-repositories.js");
vi.mock("@/service/ordem-servico/ordem-servico-helpers.js");
vi.mock("@/service/auditoria/criar-auditoria.js", () => ({
	criarAuditoriaService: vi.fn(),
}));

describe("configuração e tipos de evento OS", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(helpers.garantirConfiguracaoOrdemServico).mockResolvedValue({
			id: "cfg-1",
			idempresa: "emp-1",
			camposextras: [],
		} as never);
		vi.mocked(helpers.validarCamposExtrasConfigurados).mockImplementation(
			(campos) => ({
				valido: true,
				normalizados: (campos ?? []) as never,
			}),
		);
	});

	it("deve exigir perfil proprietario/super para editar configuração", async () => {
		const resultado = await atualizarConfiguracaoOrdemServicoService({
			idempresa: "emp-1",
			idusuario: "user-1",
			roles: ["operador"],
			dados: { tecnicoobrigatorio: 1 },
		});
		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
	});

	it("deve permitir proprietario atualizar campos extras", async () => {
		vi.mocked(
			configRepositories.atualizarConfiguracaoOrdemServico,
		).mockResolvedValue({
			id: "cfg-1",
			camposextras: [
				{
					campo: "extra1",
					nome: "Número do equipamento",
					ativo: true,
					obrigatorio: false,
				},
			],
		} as never);

		const resultado = await atualizarConfiguracaoOrdemServicoService({
			idempresa: "emp-1",
			idusuario: "user-1",
			roles: ["proprietario"],
			dados: {
				camposextras: [
					{
						campo: "extra1",
						nome: "Número do equipamento",
						ativo: true,
						obrigatorio: false,
					},
				],
			},
		});

		expect(resultado.success).toBe(true);
	});

	it("deve permitir proprietario persistir usadadosveiculo", async () => {
		vi.mocked(
			configRepositories.atualizarConfiguracaoOrdemServico,
		).mockResolvedValue({
			id: "cfg-1",
			usadadosveiculo: 0,
		} as never);

		const resultado = await atualizarConfiguracaoOrdemServicoService({
			idempresa: "emp-1",
			idusuario: "user-1",
			roles: ["proprietario"],
			dados: { usadadosveiculo: 0 },
		});

		expect(resultado.success).toBe(true);
		expect(
			configRepositories.atualizarConfiguracaoOrdemServico,
		).toHaveBeenCalledWith(
			"emp-1",
			expect.objectContaining({ usadadosveiculo: 0 }),
		);
	});

	it("não deve permitir alterar codigo interno do tipo de evento", async () => {
		vi.mocked(
			tipoRepositories.buscarTipoOrdemServicoEventoPorId,
		).mockResolvedValue({
			id: "tipo-1",
			idempresa: "emp-1",
			codigo: "ABERTA",
			status: 1,
			descricao: "Aberta",
			cor: "#FFFFFF",
			ordem: 1,
			ativo: 1,
			padrao: 1,
		} as never);
		vi.mocked(
			tipoRepositories.atualizarTipoOrdemServicoEvento,
		).mockResolvedValue({
			id: "tipo-1",
			codigo: "ABERTA",
			descricao: "Em andamento",
			cor: "#16A34A",
		} as never);

		const resultado = await atualizarTipoOrdemServicoEventoService({
			id: "tipo-1",
			idempresa: "emp-1",
			idusuario: "user-1",
			roles: ["proprietario"],
			dados: {
				descricao: "Em andamento",
				cor: "#16A34A",
			},
		});

		expect(resultado.success).toBe(true);
		expect(
			tipoRepositories.atualizarTipoOrdemServicoEvento,
		).toHaveBeenCalledWith(
			"tipo-1",
			"emp-1",
			expect.not.objectContaining({ codigo: expect.anything() }),
		);
	});
});
