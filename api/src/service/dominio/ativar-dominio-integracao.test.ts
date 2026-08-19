import { beforeEach, describe, expect, it, vi } from "vitest";
import * as dominioClient from "@/lib/dominio-client.js";
import * as dominioIntegracaoRepo from "@/repositories/dominio-integracao-repositories.js";
import * as empresaRepo from "@/repositories/empresa-repositories.js";
import * as entidadeRepo from "@/repositories/entidade-repositories.js";
import { ativarDominioIntegracaoService } from "./ativar-dominio-integracao.js";

vi.mock("@/lib/dominio-client.js");
vi.mock("@/repositories/dominio-integracao-repositories.js");
vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/util/criptografia-certificado.js", () => ({
	criptografarTexto: (texto: string) => `enc:${texto}`,
	descriptografarTexto: (texto: string) => texto.replace(/^enc:/, ""),
	normalizarCnpj: (cnpj: string) => cnpj.replace(/\D/g, ""),
}));

describe("ativarDominioIntegracaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepo.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(empresaRepo.buscarEmpresaPorId).mockResolvedValue({
			id: "emp-1",
			cnpj: "12.345.678/0001-90",
		} as never);
	});

	it("recusa chave cujo CNPJ diverge do da empresa", async () => {
		vi.mocked(dominioClient.consultarActivationInfoDominio).mockResolvedValue({
			nomeEscritorio: "Escritório X",
			nomeCliente: "Outra Empresa",
			cnpjCliente: "99888777000166",
		});

		const resultado = await ativarDominioIntegracaoService({
			idusuario: "user-1",
			idempresa: "emp-1",
			chavecontador: "chave-contador",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error).toContain("99888777000166");
		}
		expect(dominioClient.habilitarActivationDominio).not.toHaveBeenCalled();
	});

	it("ativa quando o CNPJ da chave confere com a empresa", async () => {
		vi.mocked(dominioClient.consultarActivationInfoDominio).mockResolvedValue({
			nomeEscritorio: "Escritório X",
			nomeCliente: "Empresa Teste",
			cnpjCliente: "12345678000190",
		});
		vi.mocked(dominioClient.habilitarActivationDominio).mockResolvedValue(
			"integration-key-xyz",
		);
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockResolvedValue(undefined);
		vi.mocked(dominioIntegracaoRepo.criarDominioIntegracao).mockResolvedValue({
			id: "int-1",
			idempresa: "emp-1",
			habilitado: true,
			chavecontador: "enc:chave-contador",
			integrationkey: "enc:integration-key-xyz",
			boxefile: false,
			nomeescritorio: "Escritório X",
			nomecliente: "Empresa Teste",
			cnpjcliente: "12345678000190",
			ultimoerro: null,
			ativadoem: "2026-01-01T00:00:00.000Z",
			criadoem: "2026-01-01T00:00:00.000Z",
			atualizadoem: "2026-01-01T00:00:00.000Z",
		});

		const resultado = await ativarDominioIntegracaoService({
			idusuario: "user-1",
			idempresa: "emp-1",
			chavecontador: "chave-contador",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.habilitado).toBe(true);
		expect(resultado.body?.chavecontadorMascarada).toBe("****ador");
		expect(resultado.body?.integrationKeyConfigurada).toBe(true);
	});
});
