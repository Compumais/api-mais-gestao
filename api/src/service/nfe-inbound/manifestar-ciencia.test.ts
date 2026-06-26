import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as credenciais from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import * as nfeInboundRepo from "@/repositories/nfe-inbound-repositories.js";
import { manifestarCienciaOperacaoService } from "./manifestar-ciencia-operacao.js";
import * as syncService from "./nfe-inbound-sync.service.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/service/nfe-emissao/montar-credenciais-gateway-nfe.js");
vi.mock("@/repositories/nfe-inbound-repositories.js");
vi.mock("./nfe-inbound-sync.service.js");

describe("manifestarCienciaOperacaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve enviar manifestação e re-sincronizar", async () => {
		vi.mocked(credenciais.montarCredenciaisGatewayNfe).mockResolvedValue({
			ok: true,
			configJson: {},
			pfxBase64: "pfx",
			senha: "senha",
			nfeConfiguracao: {} as never,
		});
		vi.mocked(gateway.manifestarCienciaOperacaoGateway).mockResolvedValue({
			sucesso: true,
			cStat: "135",
			xMotivo: "Evento registrado",
			protocolo: "123",
		});
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorChave).mockResolvedValue({
			id: "doc-1",
		} as never);
		vi.mocked(nfeInboundRepo.atualizarNfeInboundDocumento).mockResolvedValue(
			{} as never,
		);
		vi.mocked(syncService.sincronizarEmpresaNfeInboundService).mockResolvedValue({
			idempresa: "emp-1",
			nsuInicial: "0",
			nsuFinal: "1",
			quantidadeXml: 0,
			tempoMs: 10,
			falhas: [],
			parouPor656: false,
		});

		const resultado = await manifestarCienciaOperacaoService({
			idempresa: "emp-1",
			chavenfe: "35250612345678000190550010000000011000000010",
		});

		expect(resultado.success).toBe(true);
		expect(gateway.manifestarCienciaOperacaoGateway).toHaveBeenCalled();
		expect(syncService.sincronizarEmpresaNfeInboundService).toHaveBeenCalledWith({
			idempresa: "emp-1",
		});
	});
});
