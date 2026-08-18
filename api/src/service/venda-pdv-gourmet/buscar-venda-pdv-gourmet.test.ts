import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as pagamentoRepository from "@/repositories/venda-pdv-pagamento-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { buscarVendaPdvGourmetService } from "./buscar-venda-pdv-gourmet.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/repositories/venda-pdv-pagamento-repositories.js");

describe("buscarVendaPdvGourmetService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			pagamentoRepository.listarVendaPdvPagamentosPorVenda,
		).mockResolvedValue([]);
	});

	it("inclui status da NFC-e vinculada para o PDV sincronizar", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-1",
			idempresa: "emp-1",
			idnotafiscalnfce: "nfce-1",
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nfce-1",
			status: NFE_STATUS.INUTILIZADA,
			chavenfe: "1".repeat(44),
			serie: "3",
			numeronotafiscal: "128",
			protocolonfe: "prot-1",
		} as never);

		const resultado = await buscarVendaPdvGourmetService({
			vendaPdvGourmetId: "venda-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.nfce).toEqual({
			idnotafiscal: "nfce-1",
			status: NFE_STATUS.INUTILIZADA,
			chave: "1".repeat(44),
			serie: "3",
			numero: "128",
			protocolo: "prot-1",
		});
	});
});
