import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfeSerieRepository from "@/repositories/nfe-serie-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as xmlService from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { transmitirNfceContingenciaService } from "./transmitir-nfce-contingencia.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfe-serie-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js");

const chave = "35260812345678000190650010000000041000000010";

describe("transmitirNfceContingenciaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(xmlService.arquivarXmlNotaFiscal).mockResolvedValue(undefined);
		vi.mocked(
			nfeSerieRepository.avancarNumeroproximoSerieSeNecessario,
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
			xml: "<nfe><vNF>6.00</vNF></nfe>",
			chave,
			serie: 10,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idnotafiscal).toBe("nf-existente");
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
			xml: "<nfe><vNF>6.00</vNF></nfe>",
			chave,
			serie: 10,
			numero: 4,
			motivo: "teste",
			datacontingencia: "2026-08-17T15:00:00-03:00",
		});

		expect(resultado.body?.idnotafiscal).toBe("nf-venda");
		expect(notaRepository.criarNotaFiscalComItens).not.toHaveBeenCalled();
	});

	it("preenche série e número pela chave quando o PDV envia 0", async () => {
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
			xml: "<nfe><vNF>18.00</vNF></nfe>",
			chave,
			serie: 0,
			numero: 0,
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
