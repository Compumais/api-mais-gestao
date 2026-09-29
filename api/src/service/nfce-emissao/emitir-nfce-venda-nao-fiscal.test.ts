import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfceConfigRepository from "@/repositories/nfce-configuracao-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaItemRepository from "@/repositories/venda-pdv-item-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as complementarFiscal from "@/service/estoque/complementar-baixa-fiscal-venda-pdv.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	avaliarElegibilidadeEmitirNfceVendaNaoFiscal,
	emitirNfceVendaNaoFiscalService,
} from "./emitir-nfce-venda-nao-fiscal.js";
import * as emitirPdv from "./emitir-nfce-venda-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfce-configuracao-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-item-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/estoque/complementar-baixa-fiscal-venda-pdv.js");
vi.mock("./emitir-nfce-venda-pdv.js");

describe("avaliarElegibilidadeEmitirNfceVendaNaoFiscal", () => {
	it("rejeita venda de outra empresa", () => {
		const resultado = avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
			venda: { idempresa: "emp-2", cancelada: false },
			idempresa: "emp-1",
			statusNota: null,
		});
		expect(resultado).toEqual({
			ok: false,
			motivo: "Venda não pertence à empresa",
			ignorar: true,
		});
	});

	it("rejeita venda cancelada", () => {
		const resultado = avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
			venda: { idempresa: "emp-1", cancelada: true },
			idempresa: "emp-1",
			statusNota: null,
		});
		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.motivo).toContain("cancelada");
		}
	});

	it("marca autorizada como jaAutorizada", () => {
		const resultado = avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
			venda: { idempresa: "emp-1", cancelada: false },
			idempresa: "emp-1",
			statusNota: NFE_STATUS.AUTORIZADA,
		});
		expect(resultado).toEqual({ ok: true, jaAutorizada: true });
	});

	it("aceita gerencial e rejeitada", () => {
		expect(
			avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
				venda: { idempresa: "emp-1", cancelada: false },
				idempresa: "emp-1",
				statusNota: null,
			}),
		).toEqual({ ok: true, jaAutorizada: false });

		expect(
			avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
				venda: {
					idempresa: "emp-1",
					cancelada: false,
					idnotafiscalnfce: "n1",
				},
				idempresa: "emp-1",
				statusNota: NFE_STATUS.REJEITADA,
			}),
		).toEqual({ ok: true, jaAutorizada: false });
	});
});

describe("emitirNfceVendaNaoFiscalService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "v1",
			idempresa: "emp-1",
			cancelada: false,
			idnotafiscalnfce: null,
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(null);
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({ ambiente: 1 } as never);
		vi.mocked(vendaItemRepository.listarItensPorVendaPdv).mockResolvedValue([
			{
				idproduto: "p1",
				quantidade: "1",
				precounitario: "10",
				descricao: "Item",
			},
		] as never);
		vi.mocked(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).mockResolvedValue({ movimentosRegistrados: 1, avisos: [] });
	});

	it("retorna proibido quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario: "u1",
			idempresa: "emp-1",
			idvenda: "v1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(emitirPdv.emitirNfceVendaPdvService).not.toHaveBeenCalled();
	});

	it("é idempotente quando NFC-e já autorizada", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "v1",
			idempresa: "emp-1",
			cancelada: false,
			idnotafiscalnfce: "n1",
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "n1",
			status: NFE_STATUS.AUTORIZADA,
			chavenfe: "chave",
			protocolonfe: "prot",
			serie: "1",
			numeronotafiscal: "10",
		} as never);

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario: "u1",
			idempresa: "emp-1",
			idvenda: "v1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				emitida: true,
				jaEmitida: true,
				idnotafiscal: "n1",
			}),
		);
		expect(emitirPdv.emitirNfceVendaPdvService).not.toHaveBeenCalled();
	});

	it("complementa baixa fiscal após autorização em produção", async () => {
		vi.mocked(emitirPdv.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				emitida: true,
				idnotafiscal: "n-nova",
				serie: "1",
				numero: 11,
			},
		} as never);

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario: "u1",
			idempresa: "emp-1",
			idvenda: "v1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.emitida).toBe(true);
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				idvenda: "v1",
				idusuario: "u1",
			}),
		);
	});

	it("não complementa estoque quando emissão falha", async () => {
		vi.mocked(emitirPdv.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				emitida: false,
				xMotivo: "Rejeicao SEFAZ",
				cStat: "539",
				idnotafiscal: "n-rej",
			},
		} as never);

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario: "u1",
			idempresa: "emp-1",
			idvenda: "v1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.emitida).toBe(false);
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
	});

	it("não aplica baixa fiscal em homologação", async () => {
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({ ambiente: 2 } as never);
		vi.mocked(emitirPdv.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: true, idnotafiscal: "n-h" },
		} as never);

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario: "u1",
			idempresa: "emp-1",
			idvenda: "v1",
		});

		expect(resultado.body?.avisosEstoque?.[0]).toContain("homologação");
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
	});
});
