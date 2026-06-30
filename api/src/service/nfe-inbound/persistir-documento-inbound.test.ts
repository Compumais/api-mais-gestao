import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notaFiscalRepo from "@/repositories/nota-fiscal-repositories.js";
import * as nfeInboundRepo from "@/repositories/nfe-inbound-repositories.js";
import { persistirDocumentoInbound } from "./persistir-documento-inbound.js";
import { classificarXmlDfe } from "./classificar-xml-dfe.js";
import {
	XML_PROC_NFE,
	XML_RES_NFE,
} from "./__fixtures__/xml-dfe.fixtures.js";

vi.mock("@/repositories/nfe-inbound-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

describe("persistirDocumentoInbound - duplicidade", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("não deve regredir procNFe para resNFe", async () => {
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorChave).mockResolvedValue({
			id: "doc-existente",
			tipodocumento: "procNFe",
			idrascunho: null,
			statusmanifestacao: "sem_manifestacao",
		} as never);

		const classificado = classificarXmlDfe(XML_RES_NFE);
		const resultado = await persistirDocumentoInbound({
			idempresa: "emp-1",
			nsu: "000000000000001",
			classificado,
		});

		expect(resultado.criado).toBe(false);
		expect(nfeInboundRepo.upsertNfeInboundDocumento).not.toHaveBeenCalled();
	});

	it("deve fazer upsert para novo procNFe", async () => {
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorChave).mockResolvedValue(
			undefined,
		);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined,
		);
		vi.mocked(nfeInboundRepo.upsertNfeInboundDocumento).mockResolvedValue({
			id: "doc-novo",
		} as never);

		const classificado = classificarXmlDfe(XML_PROC_NFE);
		const resultado = await persistirDocumentoInbound({
			idempresa: "emp-1",
			nsu: "000000000000001",
			classificado,
		});

		expect(resultado.criado).toBe(true);
		expect(nfeInboundRepo.upsertNfeInboundDocumento).toHaveBeenCalledWith(
			expect.objectContaining({
				tipodocumento: "procNFe",
				statusimportacao: "disponivel",
			}),
		);
	});

	it("deve marcar como importado quando NF já existe no sistema", async () => {
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorChave).mockResolvedValue(
			undefined,
		);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-1",
			status: 1,
		} as never);
		vi.mocked(nfeInboundRepo.upsertNfeInboundDocumento).mockResolvedValue({
			id: "doc-novo",
		} as never);

		const classificado = classificarXmlDfe(XML_PROC_NFE);
		await persistirDocumentoInbound({
			idempresa: "emp-1",
			nsu: "000000000000001",
			classificado,
		});

		expect(nfeInboundRepo.upsertNfeInboundDocumento).toHaveBeenCalledWith(
			expect.objectContaining({
				statusimportacao: "importado",
			}),
		);
	});
});
