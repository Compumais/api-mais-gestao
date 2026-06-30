import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as empresaFiscalRepo from "@/repositories/empresa-fiscal-repositories.js";
import * as credenciais from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { CHAVE_NFE, XML_PROC_NFE } from "./__fixtures__/xml-dfe.fixtures.js";
import {
	buscarXmlNfePorChave,
	type ErroBuscaXmlNfePorChave,
} from "./buscar-xml-nfe-por-chave.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/service/nfe-emissao/montar-credenciais-gateway-nfe.js");
vi.mock("@/repositories/empresa-fiscal-repositories.js");

function docZipComXml(xml: string) {
	return {
		nsu: "1",
		schema: "procNFe_v4.00.xsd",
		content: gzipSync(Buffer.from(xml)).toString("base64"),
	};
}

describe("buscarXmlNfePorChave", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(credenciais.montarCredenciaisGatewayNfe).mockResolvedValue({
			ok: true,
			configJson: { cnpj: "98765432000111" },
			pfxBase64: "pfx",
			senha: "senha",
			nfeConfiguracao: { ambiente: 1 },
		} as never);
		vi.mocked(
			empresaFiscalRepo.buscarEmpresaFiscalPorEmpresa,
		).mockResolvedValue({
			uf: "SP",
		} as never);
	});

	it("deve retornar procNFe quando SEFAZ retorna XML completo", async () => {
		vi.mocked(
			gateway.consultarDistribuicaoDfePorChaveGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "138",
			xMotivo: "Documento localizado",
			docZip: [docZipComXml(XML_PROC_NFE)],
		});

		const resultado = await buscarXmlNfePorChave({
			idempresa: "emp-1",
			chaveNfe: CHAVE_NFE,
		});

		expect(resultado.tipo).toBe("procNFe");
		expect(resultado.chavenfe).toBe(CHAVE_NFE);
		expect(resultado.xml).toContain("nfeProc");
	});

	it("deve rejeitar chave inválida", async () => {
		await expect(
			buscarXmlNfePorChave({ idempresa: "emp-1", chaveNfe: "123" }),
		).rejects.toMatchObject<Partial<ErroBuscaXmlNfePorChave>>({
			codigo: "CHAVE_INVALIDA",
		});
	});

	it("deve sinalizar resNFe quando SEFAZ retorna apenas resumo", async () => {
		const xmlResNFe = `<?xml version="1.0"?><resNFe xmlns="http://www.portalfiscal.inf.br/nfe"><chNFe>${CHAVE_NFE}</chNFe></resNFe>`;

		vi.mocked(
			gateway.consultarDistribuicaoDfePorChaveGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "138",
			docZip: [docZipComXml(xmlResNFe)],
		});

		await expect(
			buscarXmlNfePorChave({ idempresa: "emp-1", chaveNfe: CHAVE_NFE }),
		).rejects.toMatchObject<Partial<ErroBuscaXmlNfePorChave>>({
			codigo: "RESUMO_APENAS",
		});
	});

	it("deve usar mensagem 137 e fallback de situação quando DF-e não localiza documento", async () => {
		vi.mocked(
			gateway.consultarDistribuicaoDfePorChaveGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "137",
			xMotivo: "Nenhum documento localizado",
			docZip: [],
		});
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
		});

		const promessa = buscarXmlNfePorChave({
			idempresa: "emp-1",
			chaveNfe: CHAVE_NFE,
		});

		await expect(promessa).rejects.toMatchObject<
			Partial<ErroBuscaXmlNfePorChave>
		>({
			codigo: "NAO_ENCONTRADO",
			cStat: "137",
			consultaSituacao: { cStat: "100", xMotivo: "Autorizado o uso da NF-e" },
		});
		await expect(promessa).rejects.toThrow(/autorizada na SEFAZ/);
		expect(gateway.consultarSituacaoChaveSefazGateway).toHaveBeenCalled();
	});

	it("deve manter mensagem 137 quando fallback de situação falha", async () => {
		vi.mocked(
			gateway.consultarDistribuicaoDfePorChaveGateway,
		).mockResolvedValue({
			sucesso: true,
			cStat: "137",
			xMotivo: "Nenhum documento localizado",
			docZip: [],
		});
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: false,
			erro: "Gateway indisponível",
		});

		const promessa = buscarXmlNfePorChave({
			idempresa: "emp-1",
			chaveNfe: CHAVE_NFE,
		});

		await expect(promessa).rejects.toThrow(/\[137\]/);
		await expect(promessa).rejects.not.toThrow(
			/não encontrada na SEFAZ para este destinatário/,
		);
	});
});
