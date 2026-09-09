import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfceConfigRepository from "@/repositories/nfce-configuracao-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as inutilizarService from "@/service/nfe-emissao/inutilizar-nfe-venda.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { registrarInutilizacaoNumeracaoNfceService } from "./registrar-inutilizacao-numeracao-nfce.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfce-configuracao-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nfe-emissao/inutilizar-nfe-venda.js");

describe("registrarInutilizacaoNumeracaoNfceService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({ ambiente: 1 } as never);
		vi.mocked(notaRepository.atualizarNotaFiscal).mockResolvedValue(
			{} as never,
		);
		vi.mocked(
			vendaRepository.buscarVendaPdvGourmetPorNotaFiscalNfce,
		).mockResolvedValue(undefined);
	});

	it("retorna idempotente se a numeração já está inutilizada", async () => {
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorSerieNumero,
		).mockResolvedValue({
			id: "nf-102",
			status: NFE_STATUS.INUTILIZADA,
			codigostatusprotocolonfe: 102,
			mensagemprotocolonfe: "Inutilizacao homologada",
			protocolonfe: "prot-1",
		} as never);

		const resultado = await registrarInutilizacaoNumeracaoNfceService({
			idusuario: "user-1",
			idempresa: "emp-1",
			serie: 1,
			numero: 22740,
			justificativa: "Numeracao abandonada por conflito de emissao",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idnotafiscal).toBe("nf-102");
		expect(inutilizarService.inutilizarNfeVendaService).not.toHaveBeenCalled();
	});

	it("cria stub e inutiliza quando a numeração não existe na retaguarda", async () => {
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorSerieNumero,
		).mockResolvedValue(undefined);
		vi.mocked(notaRepository.criarNotaFiscalComItens).mockResolvedValue({
			notaFiscal: { id: "nf-nova" },
			itens: [],
		} as never);
		vi.mocked(inutilizarService.inutilizarNfeVendaService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				idnotafiscal: "nf-nova",
				status: NFE_STATUS.INUTILIZADA,
				cStat: "102",
			},
		});

		const resultado = await registrarInutilizacaoNumeracaoNfceService({
			idusuario: "user-1",
			idempresa: "emp-1",
			serie: 1,
			numero: 22740,
			justificativa: "Numeracao abandonada por conflito de emissao",
		});

		expect(resultado.success).toBe(true);
		expect(notaRepository.criarNotaFiscalComItens).toHaveBeenCalled();
		expect(inutilizarService.inutilizarNfeVendaService).toHaveBeenCalledWith(
			expect.objectContaining({
				idnotafiscal: expect.any(String),
				permitirNfce: true,
			}),
		);
	});

	it("recusa numeração já autorizada", async () => {
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorSerieNumero,
		).mockResolvedValue({
			id: "nf-ok",
			status: NFE_STATUS.AUTORIZADA,
		} as never);

		const resultado = await registrarInutilizacaoNumeracaoNfceService({
			idusuario: "user-1",
			idempresa: "emp-1",
			serie: 1,
			numero: 10,
			justificativa: "Tentativa indevida de inutilizar autorizada",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(inutilizarService.inutilizarNfeVendaService).not.toHaveBeenCalled();
	});
});
