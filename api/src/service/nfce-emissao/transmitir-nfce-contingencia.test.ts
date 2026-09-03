import { beforeEach, describe, expect, it, vi } from "vitest";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfeSerieRepository from "@/repositories/nfe-serie-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as xmlService from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { transmitirNfceContingenciaService } from "./transmitir-nfce-contingencia.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/nfe-serie-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js");

const cnpj = "12345678000190";
const chave = "35260812345678000190650010000000049000000019";
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
	<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
		<SignedInfo>
			<Reference URI="#NFe${chave}">
				<DigestValue>digest-unit-test</DigestValue>
			</Reference>
		</SignedInfo>
		<SignatureValue>signature-unit-test</SignatureValue>
	</Signature>
</NFe>`;

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
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(
			vendaRepository.buscarVendaPdvGourmetPorNotaFiscalNfce,
		).mockResolvedValue(undefined as never);
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
			xml: xmlContingencia,
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
		vi.mocked(notaRepository.criarNotaFiscalComItens).mockResolvedValue({
			notaFiscal: { id: "nf-nova" },
			itens: [],
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

		expect(resultado.success).toBe(true);
		expect(notaRepository.criarNotaFiscalComItens).toHaveBeenCalledWith(
			expect.objectContaining({
				serie: "1",
				numeronotafiscal: "4",
				valortotalnota: "18.00",
			}),
			[],
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
});
