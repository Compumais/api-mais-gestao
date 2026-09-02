import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as movimentoRepository from "@/repositories/movimento-estoque-repositories.js";
import * as nfceConfigRepository from "@/repositories/nfce-configuracao-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as emitirNfce from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import { baixaEstoqueVendaService } from "./baixa-estoque-venda.js";
import * as complementarFiscal from "./complementar-baixa-fiscal-venda-pdv.js";
import * as registrarMovimento from "./registrar-movimento-estoque.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/nfce-configuracao-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nfce-emissao/emitir-nfce-venda-pdv.js");
vi.mock("./registrar-movimento-estoque.js");
vi.mock("./complementar-baixa-fiscal-venda-pdv.js");
vi.mock("@/service/producao/garantir-producao-na-venda.js", () => ({
	garantirProducaoNaVendaService: vi.fn().mockResolvedValue({
		success: true,
		status: 200,
		body: { executada: false, jaExistia: false },
	}),
}));

describe("baixaEstoqueVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({
			ambiente: 1,
			meiospagamentonfce: {
				dinheiro: true,
				cartao: true,
				pix: true,
				prepago: false,
			},
		} as never);
		vi.mocked(vendaRepository.atualizarVendaPdvGourmet).mockResolvedValue(
			{} as never,
		);
		vi.mocked(
			movimentoRepository.listarMovimentosEstoquePorIdOriginal,
		).mockResolvedValue([]);
		vi.mocked(registrarMovimento.registrarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);
		vi.mocked(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).mockResolvedValue({ movimentosRegistrados: 1, avisos: [] });
	});

	it("não duplica movimento operacional quando a venda já baixou o item", async () => {
		vi.mocked(
			movimentoRepository.listarMovimentosEstoquePorIdOriginal,
		).mockResolvedValue([
			{
				iditemoriginal: "prod-1",
				cancelado: 0,
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			},
		] as never);

		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "1",
					precounitario: "10",
				},
			],
			pagamentos: { valortotal: "10", valordinheiro: "10" },
			emitirNfce: false,
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.movimentosRegistrados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
		expect(emitirNfce.emitirNfceVendaPdvService).not.toHaveBeenCalled();
	});

	it("baixa só operacional sem emitir NFC-e quando emitirNfce=false", async () => {
		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "2",
					precounitario: "5",
				},
			],
			pagamentos: { valortotal: "10", valorpix: "10" },
			emitirNfce: false,
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.deveEmitirNfce).toBe(false);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
				idoriginal: "venda-1",
				iditemoriginal: "prod-1",
			}),
		);
		expect(emitirNfce.emitirNfceVendaPdvService).not.toHaveBeenCalled();
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
	});

	it("baixa só operacional quando meio de pagamento não gera NFC-e", async () => {
		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "1",
					precounitario: "10",
				},
			],
			pagamentos: { valortotal: "10", valorprepago: "10" },
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.deveEmitirNfce).toBe(false);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			}),
		);
		expect(emitirNfce.emitirNfceVendaPdvService).not.toHaveBeenCalled();
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
	});

	it("após NFC-e autorizada complementa baixa fiscal", async () => {
		vi.mocked(emitirNfce.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: true, idnotafiscal: "nf-1" },
		} as never);

		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "3",
					precounitario: "10",
				},
			],
			pagamentos: { valortotal: "30", valordinheiro: "30" },
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.deveEmitirNfce).toBe(true);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			}),
		);
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				idvenda: "venda-1",
				idempresa: "emp-1",
			}),
		);
	});

	it("não baixa fiscal quando NFC-e falha após baixa operacional", async () => {
		vi.mocked(emitirNfce.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: false, erro: "Rejeição SEFAZ" },
		} as never);

		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "1",
					precounitario: "10",
				},
			],
			pagamentos: { valortotal: "10", valorpix: "10" },
		});

		expect(resultado.success).toBe(true);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
			}),
		);
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
		expect(resultado.body?.avisos).toContain("Rejeição SEFAZ");
	});

	it("em homologação baixa operacional e não aplica fiscal", async () => {
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({
			ambiente: 2,
			meiospagamentonfce: {
				dinheiro: true,
				cartao: true,
				pix: true,
				prepago: false,
			},
		} as never);
		vi.mocked(emitirNfce.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: true, idnotafiscal: "nf-1" },
		} as never);

		const resultado = await baixaEstoqueVendaService({
			idempresa: "emp-1",
			idusuario: "user-1",
			idvenda: "venda-1",
			itens: [
				{
					idproduto: "prod-1",
					quantidade: "1",
					precounitario: "10",
				},
			],
			pagamentos: { valortotal: "10", valordinheiro: "10" },
		});

		expect(resultado.success).toBe(true);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
				idoriginal: "venda-1",
			}),
		);
		expect(
			complementarFiscal.complementarBaixaFiscalVendaPdv,
		).not.toHaveBeenCalled();
		expect(emitirNfce.emitirNfceVendaPdvService).toHaveBeenCalled();
		expect(
			resultado.body?.avisos.some((aviso) =>
				aviso.includes("baixa fiscal não aplicada"),
			),
		).toBe(true);
	});
});
