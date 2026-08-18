import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as credenciaisNfce from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import * as arquivarXml from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { reconciliarNfceAutorizadaSefaz } from "./reconciliar-nfce-autorizada-sefaz.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/nfce-emissao/montar-credenciais-gateway-nfce.js");
vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js");
vi.mock("@/util/obter-xml-nota-fiscal.js", () => ({
	obterXmlAutorizadoNotaFiscal: vi.fn().mockResolvedValue(undefined),
}));

const notaPendente = {
	id: "nfce-1",
	idempresa: "emp-1",
	modelo: "65",
	status: NFE_STATUS.PENDENTE,
	chavenfe: "35260812345678000100550010000001011000000010",
	protocolonfe: null,
	serie: "10",
	numeronotafiscal: "101",
	arquivoxmlautorizada: null,
};

describe("reconciliarNfceAutorizadaSefaz", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(credenciaisNfce.montarCredenciaisGatewayNfce).mockResolvedValue({
			ok: true,
			configJson: { modelo: 65 },
			pfxBase64: "pfx",
			senha: "senha",
		});
		vi.mocked(notaRepository.atualizarNotaFiscal).mockResolvedValue(
			{} as never,
		);
		vi.mocked(arquivarXml.arquivarXmlNotaFiscal).mockResolvedValue({} as never);
	});

	it("atualiza a nota para autorizada quando a SEFAZ já autorizou a chave", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
			protNFe: { infProt: { nProt: "prot-100", cStat: "100" } },
			xml: "<procNFe/>",
		});

		const resultado = await reconciliarNfceAutorizadaSefaz(
			notaPendente as never,
		);

		expect(resultado?.emitida).toBe(true);
		expect(resultado?.protocolo).toBe("prot-100");
		expect(notaRepository.atualizarNotaFiscal).toHaveBeenCalledWith(
			"nfce-1",
			expect.objectContaining({ status: NFE_STATUS.AUTORIZADA }),
		);
	});

	it("não reenvia quando a consulta não indica autorização", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "217",
			xMotivo: "NF-e não consta na base de dados da SEFAZ",
		});

		const resultado = await reconciliarNfceAutorizadaSefaz(
			notaPendente as never,
		);

		expect(resultado).toBeNull();
		expect(notaRepository.atualizarNotaFiscal).not.toHaveBeenCalled();
	});
});
