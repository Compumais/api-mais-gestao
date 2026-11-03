import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as dominio from "@/service/dominio/enfileirar-envio-dominio.js";
import * as credenciaisNfe from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import * as estorno from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-venda.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import * as xmlStorage from "@/util/xml-storage.js";
import { consultarSituacaoNfeVendaService } from "./consultar-situacao-nfe-venda.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/dominio/enfileirar-envio-dominio.js");
vi.mock("@/service/nfe-emissao/montar-credenciais-gateway-nfe.js");
vi.mock("@/service/nota-fiscal/estornar-integracao-nota-fiscal-venda.js");
vi.mock("@/util/xml-storage.js");

const CHAVE = "3".repeat(44);

const notaAutorizada = {
	id: "nfe-1",
	idempresa: "emp-1",
	tipoorigem: 1,
	modelo: "55",
	status: NFE_STATUS.AUTORIZADA,
	chavenfe: CHAVE,
	protocolonfe: "135150001686732",
};

const xmlCancelamentoForaPrazo = `<?xml version="1.0" encoding="UTF-8"?>
<retConsSitNFe>
  <cStat>151</cStat>
  <xMotivo>Cancelamento de NF-e homologado fora de prazo</xMotivo>
  <procEventoNFe versao="1.00">
    <evento><infEvento>
      <tpEvento>110111</tpEvento>
      <detEvento><xJust>Cancelamento extemporaneo autorizado pela SEFAZ</xJust></detEvento>
    </infEvento></evento>
    <retEvento><infEvento><nProt>999</nProt></infEvento></retEvento>
  </procEventoNFe>
</retConsSitNFe>`;

describe("consultarSituacaoNfeVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(
			notaAutorizada as never,
		);
		vi.mocked(notaRepository.atualizarNotaFiscal).mockResolvedValue({} as never);
		vi.mocked(credenciaisNfe.montarCredenciaisGatewayNfe).mockResolvedValue({
			ok: true,
			configJson: { modelo: 55 },
			pfxBase64: "pfx",
			senha: "senha",
			nfeConfiguracao: {} as never,
		});
		vi.mocked(xmlStorage.salvarXmlEventoEmDisco).mockResolvedValue("caminho.xml");
		vi.mocked(dominio.enfileirarEnvioDominioSilencioso).mockResolvedValue();
		vi.mocked(estorno.estornarIntegracaoNotaFiscalVendaService).mockResolvedValue({
			success: true,
			status: 200,
			body: { titulosCancelados: 1, movimentosEstornados: 1, avisos: [] },
		});
	});

	it("mantém a NF-e autorizada quando a SEFAZ responde 100", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
			xml: "<retConsSitNFe><cStat>100</cStat></retConsSitNFe>",
		});

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body.alterouStatus).toBe(false);
		expect(resultado.body.situacao).toBe("autorizada");
		expect(resultado.body.status).toBe(NFE_STATUS.AUTORIZADA);
		expect(notaRepository.atualizarNotaFiscal).toHaveBeenCalledWith(
			"nfe-1",
			expect.objectContaining({
				datahoraconsultasituacao: expect.any(String),
				arquivoxmlconsultasituacao: expect.stringContaining("100"),
			}),
		);
		const atualizacao = vi.mocked(notaRepository.atualizarNotaFiscal).mock
			.calls[0]?.[1];
		expect(atualizacao).not.toHaveProperty("status");
		expect(estorno.estornarIntegracaoNotaFiscalVendaService).not.toHaveBeenCalled();
	});

	it("marca cancelamento fora do prazo quando a SEFAZ responde 151", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "151",
			xMotivo: "Cancelamento de NF-e homologado fora de prazo",
			xml: xmlCancelamentoForaPrazo,
		});

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body).toMatchObject({
			alterouStatus: true,
			situacao: "cancelada",
			status: NFE_STATUS.CANCELADA_FORA_PRAZO,
			cStat: "151",
		});
		expect(notaRepository.atualizarNotaFiscal).toHaveBeenCalledWith(
			"nfe-1",
			expect.objectContaining({
				status: NFE_STATUS.CANCELADA_FORA_PRAZO,
				codigostatusprotocolonfe: 151,
				justificativacancelamentonfe:
					"Cancelamento extemporaneo autorizado pela SEFAZ",
				arquivoxmlcancelada: expect.stringContaining("110111"),
			}),
		);
		expect(xmlStorage.salvarXmlEventoEmDisco).toHaveBeenCalledWith(
			"emp-1",
			CHAVE,
			"cancelado",
			expect.stringContaining("110111"),
		);
		expect(dominio.enfileirarEnvioDominioSilencioso).toHaveBeenCalledWith({
			idempresa: "emp-1",
			idnotafiscal: "nfe-1",
			tipo: "cancelamento",
		});
		expect(estorno.estornarIntegracaoNotaFiscalVendaService).toHaveBeenCalledWith({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});
	});

	it("marca cancelamento no prazo quando a SEFAZ responde 101", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "101",
			xMotivo: "Cancelamento de NF-e homologado",
		});

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body.status).toBe(NFE_STATUS.CANCELADA);
		expect(resultado.body.alterouStatus).toBe(true);
	});

	it("não altera o status quando a SEFAZ responde 217", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "217",
			xMotivo: "NF-e não consta na base de dados da SEFAZ",
		});

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body.alterouStatus).toBe(false);
		expect(resultado.body.situacao).toBe("inalterada");
		expect(resultado.body.status).toBe(NFE_STATUS.AUTORIZADA);
		expect(estorno.estornarIntegracaoNotaFiscalVendaService).not.toHaveBeenCalled();
	});

	it("não grava a nota quando a consulta falha", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: false,
			erro: "Tempo esgotado ao aguardar resposta do gateway NF-e.",
		});

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(false);
		expect(notaRepository.atualizarNotaFiscal).not.toHaveBeenCalled();
		expect(estorno.estornarIntegracaoNotaFiscalVendaService).not.toHaveBeenCalled();
	});

	it("recusa NFC-e no fluxo de NF-e", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			...notaAutorizada,
			modelo: "65",
		} as never);

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(false);
		if (resultado.success) return;
		expect(resultado.error).toContain("Consulta NFC-e");
		expect(gateway.consultarSituacaoChaveSefazGateway).not.toHaveBeenCalled();
	});

	it("não estorna de novo uma NF-e que já está cancelada", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			...notaAutorizada,
			status: NFE_STATUS.CANCELADA_FORA_PRAZO,
		} as never);

		const resultado = await consultarSituacaoNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfe-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body.alterouStatus).toBe(false);
		expect(resultado.body.status).toBe(NFE_STATUS.CANCELADA_FORA_PRAZO);
		expect(gateway.consultarSituacaoChaveSefazGateway).not.toHaveBeenCalled();
		expect(estorno.estornarIntegracaoNotaFiscalVendaService).not.toHaveBeenCalled();
	});
});
