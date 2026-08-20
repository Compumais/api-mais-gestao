import { beforeEach, describe, expect, it, vi } from "vitest";
import * as obterXml from "@/util/obter-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { montarArquivosXmlContabilidade } from "./montar-arquivos-xml-contabilidade.js";

vi.mock("@/util/obter-xml-nota-fiscal.js");

describe("montarArquivosXmlContabilidade", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("coloca XML autorizado na pasta do modelo", async () => {
		vi.mocked(obterXml.obterXmlAutorizadoNotaFiscal).mockResolvedValue(
			"<procNFe/>",
		);

		const arquivos = await montarArquivosXmlContabilidade([
			{
				id: "nf-1",
				modelo: "55",
				chavenfe: "35260100000000000000550010000000011000000010",
				emissao: "2026-08-01",
				status: NFE_STATUS.AUTORIZADA,
			},
		]);

		expect(arquivos).toEqual([
			{
				pasta: "nfe",
				subpasta: undefined,
				nomeArquivo:
					"35260100000000000000550010000000011000000010-autorizado.xml",
				conteudo: "<procNFe/>",
			},
		]);
		expect(obterXml.obterXmlCancelamentoNotaFiscal).not.toHaveBeenCalled();
	});

	it("coloca XML autorizado e de cancelamento em nfe/canceladas", async () => {
		vi.mocked(obterXml.obterXmlAutorizadoNotaFiscal).mockResolvedValue(
			"<procNFe/>",
		);
		vi.mocked(obterXml.obterXmlCancelamentoNotaFiscal).mockResolvedValue(
			"<procEventoNFe/>",
		);

		const arquivos = await montarArquivosXmlContabilidade([
			{
				id: "nf-2",
				modelo: "55",
				chavenfe: "35260100000000000000550010000000021000000021",
				emissao: "2026-08-02",
				status: NFE_STATUS.CANCELADA,
			},
		]);

		expect(arquivos).toEqual([
			{
				pasta: "nfe",
				subpasta: "canceladas",
				nomeArquivo:
					"35260100000000000000550010000000021000000021-autorizado.xml",
				conteudo: "<procNFe/>",
			},
			{
				pasta: "nfe",
				subpasta: "canceladas",
				nomeArquivo:
					"35260100000000000000550010000000021000000021-cancelado.xml",
				conteudo: "<procEventoNFe/>",
			},
		]);
	});

	it("coloca NFC-e cancelada em nfce/canceladas", async () => {
		vi.mocked(obterXml.obterXmlAutorizadoNotaFiscal).mockResolvedValue(
			"<procNFe/>",
		);
		vi.mocked(obterXml.obterXmlCancelamentoNotaFiscal).mockResolvedValue(null);

		const arquivos = await montarArquivosXmlContabilidade([
			{
				id: "nf-3",
				modelo: "65",
				chavenfe: "35260100000000000000650010000000031000000032",
				emissao: "2026-08-03",
				status: NFE_STATUS.CANCELADA_FORA_PRAZO,
			},
		]);

		expect(arquivos).toEqual([
			{
				pasta: "nfce",
				subpasta: "canceladas",
				nomeArquivo:
					"35260100000000000000650010000000031000000032-autorizado.xml",
				conteudo: "<procNFe/>",
			},
		]);
	});
});
