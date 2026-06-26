import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import * as vendaPdvRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import { registrarVendaDashboardNfVenda } from "@/service/nota-fiscal/registrar-venda-dashboard-nf-venda.js";
import { FIN_NFE_DEVOLUCAO } from "@/util/cfop-devolucao-emissao-nfe.js";

vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js");

describe("registrarVendaDashboardNfVenda", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve ignorar NF-e de devolução", async () => {
		const resultado = await registrarVendaDashboardNfVenda({
			nota: {
				id: "nf-1",
				idempresa: "emp-1",
				modelo: "55",
				finalidadeemissaonfe: FIN_NFE_DEVOLUCAO,
				valortotalnota: "100.00",
			} as never,
			itens: [],
			idusuario: "user-1",
		});

		expect(resultado.criada).toBe(false);
		expect(vendaPdvRepository.criarVendaPdvGourmetComItens).not.toHaveBeenCalled();
	});

	it("deve criar venda e itens para NF-e autorizada", async () => {
		vi.mocked(vendaPdvRepository.buscarVendaPdvGourmetPorNotaFiscalNfce).mockResolvedValue(
			undefined,
		);
		vi.mocked(vendaPdvRepository.criarVendaPdvGourmetComItens).mockResolvedValue({
			id: "venda-1",
		} as never);

		const resultado = await registrarVendaDashboardNfVenda({
			nota: {
				id: "nf-1",
				idempresa: "emp-1",
				modelo: "55",
				finalidadeemissaonfe: 1,
				valortotalnota: "250.00",
				emissao: "2026-06-25",
			} as never,
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "2",
					precounitario: "100",
					total: "200.00",
				},
			] as never,
			emissaoSalva: { formaPagamento: "01" },
			idusuario: "user-1",
		});

		expect(resultado.criada).toBe(true);
		expect(resultado.idvenda).toBeTruthy();
		expect(vendaPdvRepository.criarVendaPdvGourmetComItens).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				idnotafiscalnfce: "nf-1",
				valortotal: "250.00",
				valordinheiro: "250.00",
			}),
			expect.arrayContaining([
				expect.objectContaining({
					idproduto: "prod-1",
					precototal: "200.00",
				}),
			]),
		);
	});

	it("deve ser idempotente quando venda já existe", async () => {
		vi.mocked(vendaPdvRepository.buscarVendaPdvGourmetPorNotaFiscalNfce).mockResolvedValue({
			id: "venda-existente",
		} as never);

		const resultado = await registrarVendaDashboardNfVenda({
			nota: {
				id: "nf-1",
				idempresa: "emp-1",
				modelo: "55",
				valortotalnota: "100.00",
			} as never,
			itens: [],
			idusuario: "user-1",
		});

		expect(resultado.criada).toBe(false);
		expect(resultado.idvenda).toBe("venda-existente");
		expect(vendaPdvRepository.criarVendaPdvGourmetComItens).not.toHaveBeenCalled();
	});

	it("deve mapear formas de pagamento por tipo documento", async () => {
		vi.mocked(vendaPdvRepository.buscarVendaPdvGourmetPorNotaFiscalNfce).mockResolvedValue(
			undefined,
		);
		vi.mocked(vendaPdvRepository.criarVendaPdvGourmetComItens).mockResolvedValue({
			id: "venda-1",
		} as never);
		vi.mocked(tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue({
			formapagamentonfe: "17",
		} as never);

		await registrarVendaDashboardNfVenda({
			nota: {
				id: "nf-1",
				idempresa: "emp-1",
				modelo: "55",
				valortotalnota: "80.00",
			} as never,
			itens: [],
			emissaoSalva: {
				formasPagamento: [
					{
						idtipodocumentofinanceiro: "tipo-pix",
						valor: 80,
					},
				],
			},
			idusuario: "user-1",
		});

		expect(vendaPdvRepository.criarVendaPdvGourmetComItens).toHaveBeenCalledWith(
			expect.objectContaining({
				valorpix: "80.00",
			}),
			[],
		);
	});
});
