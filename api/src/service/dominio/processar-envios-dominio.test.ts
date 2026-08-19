import { beforeEach, describe, expect, it, vi } from "vitest";
import * as dominioClient from "@/lib/dominio-client.js";
import * as dominioEnvioRepo from "@/repositories/dominio-envio-repositories.js";
import * as dominioIntegracaoRepo from "@/repositories/dominio-integracao-repositories.js";
import * as notaFiscalRepo from "@/repositories/nota-fiscal-repositories.js";
import * as xmlNota from "@/util/obter-xml-nota-fiscal.js";
import { processarEnviosDominioService } from "./processar-envios-dominio.js";

vi.mock("@/lib/dominio-client.js");
vi.mock("@/repositories/dominio-envio-repositories.js");
vi.mock("@/repositories/dominio-integracao-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/util/obter-xml-nota-fiscal.js");
vi.mock("@/util/mascarar-chave-dominio.js", () => ({
	descriptografarChaveDominio: (valor: string | null) =>
		valor ? valor.replace(/^enc:/, "") : null,
}));

const envioPendente = {
	id: "env-1",
	idempresa: "emp-1",
	idnotafiscal: "nf-1",
	tipo: "autorizada",
	status: "pendente",
	idloteapi: null,
	tentativas: 0,
	proximatentativa: "2026-01-01T00:00:00.000Z",
	mensagemretorno: null,
	criadoem: "2026-01-01T00:00:00.000Z",
	atualizadoem: "2026-01-01T00:00:00.000Z",
};

describe("processarEnviosDominioService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dominioEnvioRepo.listarDominioEnviosPendentes).mockResolvedValue(
			[],
		);
		vi.mocked(
			dominioEnvioRepo.listarDominioEnviosAguardandoProcessamento,
		).mockResolvedValue([]);
	});

	it("marca como armazenado quando a consulta do lote confirma o arquivo", async () => {
		vi.mocked(
			dominioEnvioRepo.listarDominioEnviosAguardandoProcessamento,
		).mockResolvedValue([
			{
				...envioPendente,
				status: "aguardando_processamento",
				idloteapi: "lote-1",
			},
		]);
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockResolvedValue({
			id: "int-1",
			idempresa: "emp-1",
			habilitado: true,
			integrationkey: "enc:key",
			boxefile: false,
		} as never);
		vi.mocked(dominioClient.consultarLoteDominio).mockResolvedValue({
			idLote: "lote-1",
			mensagem: "Arquivo armazenado na API",
			armazenado: true,
			bruto: {},
		});
		vi.mocked(dominioEnvioRepo.atualizarDominioEnvio).mockResolvedValue(
			{} as never,
		);

		const resultado = await processarEnviosDominioService(
			new Date("2026-01-01T00:00:00.000Z"),
		);

		expect(resultado.armazenados).toBe(1);
		expect(dominioEnvioRepo.atualizarDominioEnvio).toHaveBeenCalledWith(
			"env-1",
			expect.objectContaining({ status: "armazenado" }),
		);
	});

	it("envia XML pendente e grava o id do lote", async () => {
		vi.mocked(dominioEnvioRepo.listarDominioEnviosPendentes).mockResolvedValue([
			envioPendente,
		]);
		vi.mocked(dominioEnvioRepo.reivindicarDominioEnvio).mockResolvedValue(
			envioPendente,
		);
		vi.mocked(
			dominioIntegracaoRepo.buscarDominioIntegracaoPorEmpresa,
		).mockResolvedValue({
			id: "int-1",
			idempresa: "emp-1",
			habilitado: true,
			integrationkey: "enc:key",
			boxefile: false,
		} as never);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			chavenfe: "35240100000000000000550010000000011000000011",
		} as never);
		vi.mocked(xmlNota.obterXmlAutorizadoNotaFiscal).mockResolvedValue(
			"<nfeProc />",
		);
		vi.mocked(dominioClient.enviarXmlLoteDominio).mockResolvedValue({
			idLote: "lote-novo",
			mensagem: "Aguardando processamento",
			armazenado: false,
			bruto: {},
		});
		vi.mocked(dominioEnvioRepo.atualizarDominioEnvio).mockResolvedValue(
			{} as never,
		);

		const resultado = await processarEnviosDominioService(
			new Date("2026-01-01T00:00:00.000Z"),
		);

		expect(resultado.enviados).toBe(1);
		expect(dominioEnvioRepo.atualizarDominioEnvio).toHaveBeenCalledWith(
			"env-1",
			expect.objectContaining({
				status: "aguardando_processamento",
				idloteapi: "lote-novo",
			}),
		);
	});
});
