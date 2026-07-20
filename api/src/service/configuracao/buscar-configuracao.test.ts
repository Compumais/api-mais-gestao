import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configuracaoRepositories from "@/repositories/configuracao-repositories.js";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import { buscarConfiguracaoService } from "./buscar-configuracao.js";

vi.mock("@/repositories/configuracao-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");

describe("buscarConfiguracaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("cria configuração quando não existir", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			configuracaoRepositories.buscarConfiguracaoPorEmpresa,
		).mockResolvedValue(undefined);
		vi.mocked(configuracaoRepositories.criarConfiguracao).mockResolvedValue({
			id: "cfg-1",
			idempresa: "emp-1",
			notificacoes: {},
			integracao: {},
			relatorios: {},
			impressao: {},
		} as Awaited<ReturnType<typeof configuracaoRepositories.criarConfiguracao>>);

		const resultado = await buscarConfiguracaoService({
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.status).toBe(200);
		expect(configuracaoRepositories.criarConfiguracao).toHaveBeenCalledWith({
			idempresa: "emp-1",
		});
	});

	it("retorna configuração existente sem criar", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			configuracaoRepositories.buscarConfiguracaoPorEmpresa,
		).mockResolvedValue({
			id: "cfg-1",
			idempresa: "emp-1",
			notificacoes: {},
			integracao: {},
			relatorios: {},
			impressao: {},
		} as Awaited<
			ReturnType<typeof configuracaoRepositories.buscarConfiguracaoPorEmpresa>
		>);

		const resultado = await buscarConfiguracaoService({
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		expect(configuracaoRepositories.criarConfiguracao).not.toHaveBeenCalled();
	});
});
