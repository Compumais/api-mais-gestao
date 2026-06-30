import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepo from "@/repositories/entidade-repositories.js";
import * as notaFiscalRepo from "@/repositories/nota-fiscal-repositories.js";
import * as criarRascunho from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";
import { CHAVE_NFE, XML_PROC_NFE } from "./__fixtures__/xml-dfe.fixtures.js";
import * as buscarXml from "./buscar-xml-nfe-por-chave.js";
import { ErroBuscaXmlNfePorChave } from "./buscar-xml-nfe-por-chave.js";
import { importarNotaPorChaveService } from "./importar-nota-por-chave.js";

vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js");
vi.mock("./buscar-xml-nfe-por-chave.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("./buscar-xml-nfe-por-chave.js")>();
	return {
		...actual,
		buscarXmlNfePorChave: vi.fn(),
	};
});
vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/service/nfe-emissao/montar-credenciais-gateway-nfe.js");

describe("importarNotaPorChaveService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepo.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined,
		);
	});

	it("deve criar rascunho quando XML completo é obtido", async () => {
		vi.mocked(buscarXml.buscarXmlNfePorChave).mockResolvedValue({
			chavenfe: CHAVE_NFE,
			tipo: "procNFe",
			xml: XML_PROC_NFE,
		});
		vi.mocked(criarRascunho.criarRascunhoImportacaoNfService).mockResolvedValue(
			{
				success: true,
				status: 201,
				body: { idRascunho: "rascunho-1" },
			} as never,
		);

		const resultado = await importarNotaPorChaveService({
			idempresa: "emp-1",
			idusuario: "user-1",
			chaveNfe: CHAVE_NFE,
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idRascunho).toBe("rascunho-1");
		expect(resultado.body?.urlRascunho).toContain("rascunho-1");
	});

	it("deve rejeitar chave inválida", async () => {
		const resultado = await importarNotaPorChaveService({
			idempresa: "emp-1",
			idusuario: "user-1",
			chaveNfe: "123",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});

	it("deve bloquear NF já importada", async () => {
		vi.mocked(notaFiscalRepo.buscarNotaFiscalPorChaveNfe).mockResolvedValue({
			id: "nf-1",
			status: 1,
		} as never);

		const resultado = await importarNotaPorChaveService({
			idempresa: "emp-1",
			idusuario: "user-1",
			chaveNfe: CHAVE_NFE,
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});

	it("deve retornar erro quando SEFAZ não encontra a nota", async () => {
		vi.mocked(buscarXml.buscarXmlNfePorChave).mockRejectedValue(
			new ErroBuscaXmlNfePorChave(
				"[137] Nenhum documento localizado na Distribuição DF-e",
				"NAO_ENCONTRADO",
				"137",
				{ cStat: "100", xMotivo: "Autorizado o uso da NF-e" },
			),
		);

		const resultado = await importarNotaPorChaveService({
			idempresa: "emp-1",
			idusuario: "user-1",
			chaveNfe: CHAVE_NFE,
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		if (!resultado.success) {
			expect(resultado.cStat).toBe("137");
			expect(resultado.codigoErro).toBe("NAO_ENCONTRADO");
			expect(resultado.consultaSituacao?.cStat).toBe("100");
		}
	});
});
