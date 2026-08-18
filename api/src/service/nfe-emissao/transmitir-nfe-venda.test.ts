import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { transmitirNfeVendaService } from "./transmitir-nfe-venda.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/nfe-emissao/emitir-nfe-venda.js");
vi.mock("@/service/nfe-emissao/mapear-itens-nota-para-emissao.js");
vi.mock("@/util/cfop-devolucao-emissao-nfe.js", () => ({
	FIN_NFE_DEVOLUCAO: 4,
	resolverTipoDevolucaoEmissao: vi.fn().mockResolvedValue(undefined),
}));

describe("transmitirNfeVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
	});

	it("recusa transmitir NFC-e pelo fluxo de NF-e de venda", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nfce-1",
			idempresa: "emp-1",
			tipoorigem: 1,
			modelo: "65",
			status: NFE_STATUS.PENDENTE,
		} as never);

		const resultado = await transmitirNfeVendaService({
			idusuario: "user-1",
			idnotafiscal: "nfce-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toContain("Consulta NFC-e");
		expect(notaRepository.listarItensPorNotaFiscal).not.toHaveBeenCalled();
	});
});
