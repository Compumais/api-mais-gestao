import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/nfse-gateway-client.js", () => ({
	emitirNfseGateway: vi.fn(),
}));

vi.mock("@/repositories/nota-fiscal-repositories.js", () => ({
	criarNotaFiscalComItens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/ordem-servico-repositories.js", () => ({
	buscarOrdemServicoPorIdEempresa: vi.fn(),
}));

vi.mock("@/repositories/ordem-servico-faturamento-repositories.js", () => ({
	buscarFaturamentoFiscalPorModeloOrdemServico: vi.fn(),
	criarOrdemServicoFaturamento: vi.fn(),
}));

vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js", () => ({
	arquivarXmlNotaFiscal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/service/nfse-emissao/integrar-nfse-autorizada.js", () => ({
	integrarNfseAutorizadaService: vi.fn().mockResolvedValue({
		success: true,
		status: 200,
		body: { parcelasGeradas: 0, lancamentosCaixa: 0, avisos: [] },
	}),
}));

vi.mock("@/service/nfse-emissao/preparar-payload-emissao-nfse.js", () => ({
	prepararPayloadEmissaoNfse: vi.fn(),
}));

import { emitirNfseGateway } from "@/lib/nfse-gateway-client.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { prepararPayloadEmissaoNfse } from "@/service/nfse-emissao/preparar-payload-emissao-nfse.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { emitirNfseService } from "./emitir-nfse.js";

describe("emitirNfseService — Sefin Nacional", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const paramsBase = {
		idempresa: "emp-1",
		idusuario: "user-1",
		iddestinatario: "ent-1",
		servico: {
			itemListaServico: "0101",
			discriminacao: "Serviço teste",
			codigoTributacaoNacional: "010101",
			codigoNbs: "115021000",
			valores: { servicos: 100, aliquota: 2, iss: 2 },
		},
	};

	function mockPreparar() {
		vi.mocked(prepararPayloadEmissaoNfse).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				payloadGateway: {
					configJson: {
						provedor: "sefin_nacional",
						versaolayout: "dps-1.01",
						ambiente: 2,
					},
					pfxBase64: "YQ==",
					senha: "x",
					payloadNfse: {
						prestador: { cnpj: "1", im: "1", municipioIbge: "3550308" },
						tomador: { cnpjCpf: "2", razaoSocial: "T" },
						rps: {
							numero: 10,
							serie: "1",
							dataEmissao: "2026-11-06",
							competencia: "2026-11-06",
						},
						servico: {
							itemListaServico: "0101",
							discriminacao: "Serviço teste",
							valores: { servicos: 100, aliquota: 2, iss: 2 },
						},
					},
				},
				numeroRps: 10,
				serie: "1",
				ambiente: 2,
				valorTotal: 100,
				destinatario: { cnpjCpf: "2", razaoSocial: "T" },
				dadosSalvos: { gerarFinanceiro: false },
			},
		} as never);
	}

	it("autoriza com chaveAcesso 50 dígitos mesmo sem numeroNfse", async () => {
		mockPreparar();
		const chave = "9".repeat(50);
		vi.mocked(emitirNfseGateway).mockResolvedValue({
			sucesso: true,
			chaveAcesso: chave,
			codigoVerificacao: chave,
			idDps: "DPS" + "0".repeat(42),
			modo: "dps",
			provedor: "sefin_nacional",
		});

		const resultado = await emitirNfseService(paramsBase as never);
		expect(resultado.success).toBe(true);
		expect(resultado.body?.numeroNfse ?? null).toBeNull();

		const notaCriada = vi.mocked(criarNotaFiscalComItens).mock.calls[0]?.[0];
		expect(notaCriada?.status).toBe(NFE_STATUS.AUTORIZADA);
		expect(notaCriada?.codigoautenticidadenfse).toBe(chave);
		expect(
			(notaCriada?.dadosimportacao as { idDps?: string } | undefined)?.idDps,
		).toBeTruthy();
	});

	it("marca pendente quando gateway retorna pendente + idDps", async () => {
		mockPreparar();
		vi.mocked(emitirNfseGateway).mockResolvedValue({
			sucesso: false,
			pendente: true,
			idDps: "DPS355030821234567800019500001000000000000010",
			modo: "dps",
			provedor: "sefin_nacional",
			erros: [{ codigo: "REDE", mensagem: "timeout" }],
		});

		const resultado = await emitirNfseService(paramsBase as never);
		expect(resultado.success).toBe(true);
		const notaCriada = vi.mocked(criarNotaFiscalComItens).mock.calls[0]?.[0];
		expect(notaCriada?.status).toBe(NFE_STATUS.PENDENTE);
		expect(notaCriada?.mensagemtransmissaonfe).toMatch(/Id DPS/i);
	});

	it("rejeita com erros do gateway", async () => {
		mockPreparar();
		vi.mocked(emitirNfseGateway).mockResolvedValue({
			sucesso: false,
			pendente: false,
			modo: "dps",
			provedor: "sefin_nacional",
			erros: [{ codigo: "E999", mensagem: "rejeicao teste" }],
		});

		await emitirNfseService(paramsBase as never);
		const notaCriada = vi.mocked(criarNotaFiscalComItens).mock.calls[0]?.[0];
		expect(notaCriada?.status).toBe(NFE_STATUS.REJEITADA);
		expect(notaCriada?.mensagemtransmissaonfe).toMatch(/rejeicao teste/i);
	});
});
