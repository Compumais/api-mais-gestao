import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gatewayClient from "@/lib/nfe-gateway-client.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfeSerieRepository from "@/repositories/nfe-serie-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as xmlService from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import * as credenciaisService from "./montar-credenciais-gateway-nfce.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { transmitirNfceContingenciaService } from "./transmitir-nfce-contingencia.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/nfe-serie-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js");
vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("./montar-credenciais-gateway-nfce.js");

const cnpj = "12345678000190";
const chave = "35260812345678000190650010000000049000000019";
const chaveRival = "35260812345678000190650010000000049000000099";
const xmlContingencia = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
	<infNFe Id="NFe${chave}" versao="4.00">
		<ide>
			<cUF>35</cUF>
			<mod>65</mod>
			<serie>1</serie>
			<nNF>4</nNF>
			<tpEmis>9</tpEmis>
			<tpAmb>2</tpAmb>
		</ide>
		<emit><CNPJ>${cnpj}</CNPJ><xNome>Empresa Teste</xNome></emit>
		<total><ICMSTot><vNF>18.00</vNF></ICMSTot></total>
	</infNFe>
</NFe>`;
const xmlContingenciaCompleto = xmlContingencia
	.replace(
		"<tpAmb>2</tpAmb>",
		"<tpAmb>2</tpAmb><dhEmi>2026-08-17T15:00:00-03:00</dhEmi><dhCont>2026-08-17T15:00:00-03:00</dhCont>",
	)
	.replace(
		"<emit><CNPJ>",
		"<emit><enderEmit><xLgr>Rua Teste</xLgr></enderEmit><IE>123</IE><CRT>1</CRT><CNPJ>",
	)
	.replace(
		"<total>",
		"<det nItem=\"1\"><prod><NCM>12345678</NCM><CFOP>5102</CFOP></prod><imposto><ICMS /></imposto></det><transp><modFrete>9</modFrete></transp><pag><detPag><tPag>01</tPag><vPag>18.00</vPag></detPag></pag><total>",
	);

describe("transmitirNfceContingenciaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue({
			id: "emp-1",
			cnpj,
		} as never);
		vi.mocked(xmlService.arquivarXmlNotaFiscal).mockResolvedValue(undefined);
		vi.mocked(
			nfeSerieRepository.avancarNumeroproximoSerieSeNecessario,
		).mockResolvedValue(undefined as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorSerieNumero,
		).mockResolvedValue(undefined as never);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(
			vendaRepository.buscarVendaPdvGourmetPorNotaFiscalNfce,
		).mockResolvedValue(undefined as never);
		vi.mocked(
			notaRepository.registrarNotaFiscalContingenciaPdv,
		).mockImplementation(async (nota) => nota as never);
		vi.mocked(credenciaisService.montarCredenciaisGatewayNfce).mockResolvedValue({
			ok: true,
			configJson: { tpAmb: 2, cnpj },
			pfxBase64: "pfx",
			senha: "senha",
		});
		vi.mocked(
			gatewayClient.consultarSituacaoChaveSefazGateway,
		).mockResolvedValue({
			sucesso: false,
			erro: "timeout",
		});
	});

	it("não cria outra nota quando a chave já existe", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-existente",
			modelo: "65",
			status: NFE_STATUS.REJEITADA,
			chavenfe: chave,
		} as never);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			xml: xmlContingenciaCompleto,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idnotafiscal).toBe("nf-existente");
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("vincula nota criada com UUID local à venda remota correspondente", async () => {
		const idVendaLocal = "91218e62-f0f8-49b0-857c-92dd307c5d2a";
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-existente",
			modelo: "65",
			status: NFE_STATUS.PENDENTE,
			chavenfe: chave,
			dadosimportacao: { idvenda: idVendaLocal },
		} as never);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-remota",
			idempresa: "emp-1",
			idvendalocal: idVendaLocal,
			idnotafiscalnfce: null,
		} as never);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-remota",
			xml: xmlContingencia,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(true);
		expect(vendaRepository.atualizarVendaPdvGourmet).toHaveBeenCalledWith(
			"venda-remota",
			{ idnotafiscalnfce: "nf-existente" },
		);
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("recusa nota existente já vinculada a outra venda", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-existente",
			modelo: "65",
			status: NFE_STATUS.PENDENTE,
			chavenfe: chave,
		} as never);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-remota",
			idempresa: "emp-1",
			idnotafiscalnfce: null,
		} as never);
		vi.mocked(
			vendaRepository.buscarVendaPdvGourmetPorNotaFiscalNfce,
		).mockResolvedValue({
			id: "outra-venda",
			idempresa: "emp-1",
		} as never);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-remota",
			xml: xmlContingencia,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error).toBe("NFC-e já vinculada a outra venda");
		}
		expect(vendaRepository.atualizarVendaPdvGourmet).not.toHaveBeenCalled();
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("não cria stub se a venda já tem NFC-e na retaguarda", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-1",
			idempresa: "emp-1",
			idnotafiscalnfce: "nf-venda",
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-venda",
			status: NFE_STATUS.REJEITADA,
			chavenfe: chave,
		} as never);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			xml: xmlContingencia,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.body?.idnotafiscal).toBe("nf-venda");
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("persiste XML de contingência com dados fiscais consistentes", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-1",
			idempresa: "emp-1",
			idnotafiscalnfce: null,
			valortotal: "18.00",
		} as never);
		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			xml: xmlContingenciaCompleto,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(true);
		expect(
			notaRepository.registrarNotaFiscalContingenciaPdv,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				serie: "1",
				numeronotafiscal: "4",
				valortotalnota: "18.00",
				arquivoxmlcontingencia: xmlContingenciaCompleto,
				arquivoxmlassinado: null,
			}),
			"venda-1",
			4,
		);
	});

	it("recusa stub sem série/número nem chave válida", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue(
			undefined as never,
		);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			xml: "<nfe></nfe>",
			serie: 0,
			numero: 0,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(false);
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("recusa contingência quando série/número já existem com outra chave", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorSerieNumero,
		).mockResolvedValue({
			id: "nf-rival",
			modelo: "65",
			status: NFE_STATUS.AUTORIZADA,
			chavenfe: chaveRival,
			serie: "1",
			numeronotafiscal: "4",
		} as never);

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			xml: xmlContingencia,
			chave,
			serie: 1,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.code).toBe("NFCE_NUMERO_JA_USADO");
			expect(resultado.error).toMatch(/já utilizada/i);
		}
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("consulta antes de transmitir e persiste autorização do mesmo XML", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-existente",
			idempresa: "emp-1",
			modelo: "65",
			status: NFE_STATUS.PENDENTE,
			chavenfe: chave,
			dadosimportacao: { tpEmis: 9 },
		} as never);
		vi.mocked(
			gatewayClient.consultarSituacaoChaveSefazGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "217",
			xMotivo: "NF-e não consta na base",
		});
		vi.mocked(
			gatewayClient.transmitirXmlNfceContingenciaGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
			chave,
			protocolo: "135260000000001",
			xmlAssinado: "<NFe>assinado</NFe>",
			xmlAutorizado: "<nfeProc>autorizado</nfeProc>",
		});

		const resultado = await transmitirNfceContingenciaService({
			idusuario: "user-1",
			idempresa: "emp-1",
			xml: xmlContingenciaCompleto,
			chave,
			serie: 1,
			numero: 4,
			motivo: "falha de conexão",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.body).toMatchObject({
			status: "autorizada",
			transmitida: true,
			cStat: "100",
			protocolo: "135260000000001",
		});
		expect(
			gatewayClient.consultarSituacaoChaveSefazGateway,
		).toHaveBeenCalledBefore(
			vi.mocked(gatewayClient.transmitirXmlNfceContingenciaGateway),
		);
		expect(notaRepository.atualizarNotaFiscal).toHaveBeenCalledWith(
			"nf-existente",
			expect.objectContaining({
				status: NFE_STATUS.AUTORIZADA,
				arquivoxmlassinado: "<NFe>assinado</NFe>",
				arquivoxmlautorizada: "<nfeProc>autorizado</nfeProc>",
			}),
		);
	});
});
