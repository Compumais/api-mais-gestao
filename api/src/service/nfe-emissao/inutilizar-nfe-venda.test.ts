import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as credenciaisNfce from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import * as credenciaisNfe from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { inutilizarNfeVendaService } from "./inutilizar-nfe-venda.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/nfce-emissao/montar-credenciais-gateway-nfce.js");
vi.mock("@/service/nfe-emissao/montar-credenciais-gateway-nfe.js");
vi.mock("@/util/xml-storage.js");

const notaNfce = {
	id: "nfce-1",
	idempresa: "emp-1",
	tipoorigem: 1,
	modelo: "65",
	serie: "3",
	numeronotafiscal: "128",
	status: NFE_STATUS.REJEITADA,
	protocolonfe: null,
};

describe("inutilizarNfeVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(notaRepository.atualizarNotaFiscal).mockResolvedValue(
			{} as never,
		);
		vi.mocked(gateway.inutilizarNfeGateway).mockResolvedValue({
			sucesso: true,
			cStat: "102",
			xMotivo: "Inutilizacao de numero homologado",
			protocolo: "prot-1",
		});
	});

	it("inutiliza NFC-e com modelo 65 e série do cupom", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(
			notaNfce as never,
		);
		vi.mocked(credenciaisNfce.montarCredenciaisGatewayNfce).mockResolvedValue({
			ok: true,
			configJson: { modelo: 65, tpAmb: 2 },
			pfxBase64: "pfx",
			senha: "senha",
		});

		const resultado = await inutilizarNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfce-1",
			justificativa: "Numeração não utilizada por rejeição da NFC-e",
		});

		expect(resultado.success).toBe(true);
		expect(credenciaisNfce.montarCredenciaisGatewayNfce).toHaveBeenCalledWith(
			"emp-1",
		);
		expect(credenciaisNfe.montarCredenciaisGatewayNfe).not.toHaveBeenCalled();
		expect(gateway.inutilizarNfeGateway).toHaveBeenCalledWith(
			expect.objectContaining({
				configJson: expect.objectContaining({ modelo: 65 }),
				dados: expect.objectContaining({
					modelo: 65,
					serie: 3,
					numeroInicial: 128,
					numeroFinal: 128,
					ano: expect.stringMatching(/^\d{2}$/),
				}),
			}),
		);
	});

	it("inutiliza NF-e com modelo 55", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			...notaNfce,
			id: "nfe-1",
			modelo: "55",
			serie: "1",
			numeronotafiscal: "10",
		} as never);
		vi.mocked(credenciaisNfe.montarCredenciaisGatewayNfe).mockResolvedValue({
			ok: true,
			configJson: { modelo: 55, tpAmb: 2 },
			pfxBase64: "pfx",
			senha: "senha",
			nfeConfiguracao: {} as never,
		});

		const resultado = await inutilizarNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
			justificativa: "Numeração não utilizada por rejeição da NF-e",
		});

		expect(resultado.success).toBe(true);
		expect(credenciaisNfe.montarCredenciaisGatewayNfe).toHaveBeenCalledWith(
			"emp-1",
		);
		expect(credenciaisNfce.montarCredenciaisGatewayNfce).not.toHaveBeenCalled();
		expect(gateway.inutilizarNfeGateway).toHaveBeenCalledWith(
			expect.objectContaining({
				dados: expect.objectContaining({
					modelo: 55,
					serie: 1,
					numeroInicial: 10,
				}),
			}),
		);
	});
});
