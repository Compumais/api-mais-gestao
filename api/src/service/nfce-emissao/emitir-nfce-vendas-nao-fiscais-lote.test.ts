import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as contexto from "./contexto-emissao-nfce.js";
import * as emitirUnitaria from "./emitir-nfce-venda-nao-fiscal.js";
import { emitirNfceVendasNaoFiscaisLoteService } from "./emitir-nfce-vendas-nao-fiscais-lote.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("./contexto-emissao-nfce.js");
vi.mock("./emitir-nfce-venda-nao-fiscal.js", async () => {
	const actual = await vi.importActual<
		typeof import("./emitir-nfce-venda-nao-fiscal.js")
	>("./emitir-nfce-venda-nao-fiscal.js");
	return {
		...actual,
		emitirNfceVendaNaoFiscalService: vi.fn(),
	};
});

describe("emitirNfceVendasNaoFiscaisLoteService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contexto.carregarContextoEmissaoNfce).mockResolvedValue({
			empresa: { id: "emp-1" },
			empresaFiscal: { id: "ef-1" },
			nfceConfiguracao: { ambiente: 1 },
			certificadoAtivo: { id: "cert-1" },
			seriePadrao: { id: "serie-1" },
			pendencias: [],
		} as never);
	});

	it("retorna proibido quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await emitirNfceVendasNaoFiscaisLoteService({
			idusuario: "u1",
			idempresa: "emp-1",
			idsVendas: ["11111111-1111-1111-1111-111111111111"],
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(contexto.carregarContextoEmissaoNfce).not.toHaveBeenCalled();
	});

	it("aborta sem emitir quando contexto fiscal está incompleto", async () => {
		vi.mocked(contexto.carregarContextoEmissaoNfce).mockResolvedValue({
			empresa: { id: "emp-1" },
			empresaFiscal: null,
			nfceConfiguracao: null,
			certificadoAtivo: null,
			seriePadrao: null,
			pendencias: [
				{ codigo: "CERTIFICADO_ATIVO", mensagem: "Cadastre certificado" },
			],
		} as never);

		const resultado = await emitirNfceVendasNaoFiscaisLoteService({
			idusuario: "u1",
			idempresa: "emp-1",
			idsVendas: ["11111111-1111-1111-1111-111111111111"],
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(resultado.error).toContain("Configuração fiscal incompleta");
		expect(
			emitirUnitaria.emitirNfceVendaNaoFiscalService,
		).not.toHaveBeenCalled();
	});

	it("continua o lote após rejeição e agrega relatório", async () => {
		const id1 = "11111111-1111-1111-1111-111111111111";
		const id2 = "22222222-2222-2222-2222-222222222222";
		const id3 = "33333333-3333-3333-3333-333333333333";

		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId)
			.mockResolvedValueOnce({
				id: id1,
				idempresa: "emp-1",
				cancelada: false,
				idnotafiscalnfce: null,
			} as never)
			.mockResolvedValueOnce({
				id: id2,
				idempresa: "emp-1",
				cancelada: false,
				idnotafiscalnfce: null,
			} as never)
			.mockResolvedValueOnce({
				id: id3,
				idempresa: "emp-1",
				cancelada: true,
				idnotafiscalnfce: null,
			} as never);

		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(null);

		vi.mocked(emitirUnitaria.emitirNfceVendaNaoFiscalService)
			.mockResolvedValueOnce({
				success: true,
				status: 200,
				body: {
					emitida: true,
					idnotafiscal: "n1",
					serie: "1",
					numero: 10,
				},
			} as never)
			.mockResolvedValueOnce({
				success: true,
				status: 200,
				body: {
					emitida: false,
					idnotafiscal: "n2",
					serie: "1",
					numero: 11,
					xMotivo: "Rejeicao SEFAZ",
					cStat: "539",
				},
			} as never);

		const resultado = await emitirNfceVendasNaoFiscaisLoteService({
			idusuario: "u1",
			idempresa: "emp-1",
			idsVendas: [id1, id2, id3],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				total: 3,
				autorizadas: 1,
				falhas: 1,
				ignoradas: 1,
			}),
		);
		expect(resultado.body?.itens[0]?.sucesso).toBe(true);
		expect(resultado.body?.itens[1]?.sucesso).toBe(false);
		expect(resultado.body?.itens[1]?.mensagem).toContain("Rejeicao");
		expect(resultado.body?.itens[2]?.ignorada).toBe(true);
		expect(emitirUnitaria.emitirNfceVendaNaoFiscalService).toHaveBeenCalledTimes(
			2,
		);
	});

	it("deduplica ids e limita a 100", async () => {
		const id = "11111111-1111-1111-1111-111111111111";
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id,
			idempresa: "emp-1",
			cancelada: false,
			idnotafiscalnfce: null,
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(null);
		vi.mocked(emitirUnitaria.emitirNfceVendaNaoFiscalService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: true, idnotafiscal: "n1" },
		} as never);

		const resultado = await emitirNfceVendasNaoFiscaisLoteService({
			idusuario: "u1",
			idempresa: "emp-1",
			idsVendas: [id, id],
		});

		expect(resultado.body?.total).toBe(1);
		expect(emitirUnitaria.emitirNfceVendaNaoFiscalService).toHaveBeenCalledTimes(
			1,
		);
	});
});
