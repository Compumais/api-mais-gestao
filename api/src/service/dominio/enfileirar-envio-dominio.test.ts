import { beforeEach, describe, expect, it, vi } from "vitest";
import * as dominioEnvioRepo from "@/repositories/dominio-envio-repositories.js";
import * as dominioIntegracaoRepo from "@/repositories/dominio-integracao-repositories.js";
import {
	enfileirarEnvioDominioService,
	enfileirarEnvioDominioSilencioso,
} from "./enfileirar-envio-dominio.js";

vi.mock("@/repositories/dominio-envio-repositories.js");
vi.mock("@/repositories/dominio-integracao-repositories.js");

describe("enfileirarEnvioDominioService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("não enfileira quando a integração está desabilitada", async () => {
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockResolvedValue({
			id: "int-1",
			idempresa: "emp-1",
			habilitado: false,
			integrationkey: "enc:key",
		} as never);

		const resultado = await enfileirarEnvioDominioService({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			tipo: "autorizada",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toBeNull();
		expect(dominioEnvioRepo.criarDominioEnvio).not.toHaveBeenCalled();
	});

	it("não duplica envio já pendente", async () => {
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockResolvedValue({
			id: "int-1",
			idempresa: "emp-1",
			habilitado: true,
			integrationkey: "enc:key",
		} as never);

		const existente = {
			id: "env-1",
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			tipo: "autorizada",
			status: "pendente",
			idloteapi: null,
			tentativas: 0,
			proximatentativa: null,
			mensagemretorno: null,
			criadoem: "2026-01-01T00:00:00.000Z",
			atualizadoem: "2026-01-01T00:00:00.000Z",
		};
		vi.mocked(
			dominioEnvioRepo.buscarDominioEnvioPorNotaETipo,
		).mockResolvedValue(existente);

		const resultado = await enfileirarEnvioDominioService({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			tipo: "autorizada",
		});

		expect(resultado.body?.id).toBe("env-1");
		expect(dominioEnvioRepo.criarDominioEnvio).not.toHaveBeenCalled();
		expect(dominioEnvioRepo.atualizarDominioEnvio).not.toHaveBeenCalled();
	});

	it("não quebra a emissão se o enfileiramento falhar", async () => {
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockRejectedValue(new Error("Domínio fora"));

		await expect(
			enfileirarEnvioDominioSilencioso({
				idempresa: "emp-1",
				idnotafiscal: "nf-1",
				tipo: "autorizada",
			}),
		).resolves.toBeUndefined();
	});
});
