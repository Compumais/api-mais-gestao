import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notaFiscalRepo from "@/repositories/nota-fiscal-repositories.js";
import * as nfeInboundRepo from "@/repositories/nfe-inbound-repositories.js";
import * as entidadeRepo from "@/repositories/entidade-repositories.js";
import * as criarRascunho from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";
import { importPurchaseInvoiceService } from "./import-purchase-invoice.js";
import { XML_PROC_NFE, CHAVE_NFE } from "./__fixtures__/xml-dfe.fixtures.js";

vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/nfe-inbound-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js");

describe("importPurchaseInvoiceService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar rascunho para procNFe disponível", async () => {
		vi.mocked(entidadeRepo.verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorId).mockResolvedValue({
			id: "doc-1",
			idempresa: "emp-1",
			tipodocumento: "procNFe",
			chavenfe: CHAVE_NFE,
			xml: XML_PROC_NFE,
			idrascunho: null,
		} as never);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined,
		);
		vi.mocked(criarRascunho.criarRascunhoImportacaoNfService).mockResolvedValue({
			success: true,
			status: 200,
			body: { idRascunho: "rascunho-1" },
		} as never);
		vi.mocked(nfeInboundRepo.atualizarNfeInboundDocumento).mockResolvedValue(
			{} as never,
		);

		const resultado = await importPurchaseInvoiceService({
			idDocumento: "doc-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idRascunho).toBe("rascunho-1");
		expect(criarRascunho.criarRascunhoImportacaoNfService).toHaveBeenCalled();
	});

	it("deve bloquear duplicidade quando NF já importada", async () => {
		vi.mocked(entidadeRepo.verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorId).mockResolvedValue({
			id: "doc-1",
			idempresa: "emp-1",
			tipodocumento: "procNFe",
			chavenfe: CHAVE_NFE,
			xml: XML_PROC_NFE,
			idrascunho: null,
		} as never);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-1",
			status: 1,
		} as never);

		const resultado = await importPurchaseInvoiceService({
			idDocumento: "doc-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});
});
