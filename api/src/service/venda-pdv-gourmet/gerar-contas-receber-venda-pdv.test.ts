import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as condicaoPagamentoRepository from "@/repositories/condicao-pagamento-repositories.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import { gerarContasReceberVendaPdvService } from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";

vi.mock("@/repositories/condicao-pagamento-repositories.js");
vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js");

const vendaBase: VendaPdvGourmet = {
	id: "venda-1",
	idempresa: "emp-1",
	idcontamesa: null,
	vendalocal: 1,
	numeropdv: 42,
	idvendaitem: null,
	valordinheiro: null,
	valorcartao: null,
	valorcartaocredito: null,
	valorcartaodebito: null,
	valorpix: null,
	valorprepago: null,
	valortroco: null,
	valortotal: "100.00",
	deveemitirnfce: false,
	idnotafiscalnfce: null,
	identidade: "cliente-1",
	idcondicaopagto: null,
	datacriacao: null,
	dataalteracao: null,
	usuarioquefechouvenda: "user-1",
};

describe("gerarContasReceberVendaPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			financeiroRepository.buscarFinanceirosPorOrigem,
		).mockResolvedValue([]);
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue({
			id: "emp-1",
			prazocartaocredito: 30,
			prazocartaodebito: 1,
		} as never);
	});

	it("rejeita pagamento a prazo sem identidade", async () => {
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-boleto",
			aprazo: 1,
			integracaixabanco: 0,
			prazodias: 30,
			descricao: "Boleto",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 }],
		});

		expect(resultado.success).toBe(false);
		if (resultado.success) return;
		expect(resultado.status).toBe(400);
	});

	it("rejeita entidade que não é cliente", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cliente-1",
			idempresa: "emp-1",
			cliente: 0,
			nome: "Fornecedor X",
		} as never);
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-boleto",
			aprazo: 1,
			integracaixabanco: 0,
			prazodias: 30,
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 }],
		});

		expect(resultado.success).toBe(false);
	});

	it("gera título único para forma a prazo", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cliente-1",
			idempresa: "emp-1",
			cliente: 1,
			nome: "Cliente PDV",
			cnpjcpf: "12345678901",
		} as never);
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-boleto",
			aprazo: 1,
			integracaixabanco: 0,
			prazodias: 30,
			idplanocontas: "plano-1",
			descricao: "Boleto",
		} as never);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-1",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(1);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledWith(
			expect.objectContaining({
				identidade: "cliente-1",
				idorigem: "venda-1",
				parcela: 1,
				totalparcelas: 1,
				emitente: expect.stringContaining("Cliente PDV"),
			}),
		);
	});

	it("gera recebível de cartão sem cliente e preenche nome/parcela", async () => {
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-credito",
			aprazo: 0,
			integracaixabanco: 0,
			prazodias: 30,
			formapagamentonfe: "03",
			descricao: "Cartão de crédito",
		} as never);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-cartao",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-credito", valor: 20 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(1);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledWith(
			expect.objectContaining({
				identidade: null,
				parcela: 1,
				totalparcelas: 1,
				documento: "PDV 42",
				emitente: expect.stringContaining("Cartão de crédito"),
			}),
		);
		expect(entidadeRepository.buscarEntidadePorId).not.toHaveBeenCalled();
	});

	it("não gera título para forma de caixa imediato", async () => {
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-pix",
			aprazo: 0,
			integracaixabanco: 1,
			formapagamentonfe: "17",
			descricao: "PIX",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-pix", valor: 50 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(0);
		expect(financeiroRepository.criarFinanceiro).not.toHaveBeenCalled();
	});

	it("gera parcelas por condição de pagamento", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cliente-1",
			idempresa: "emp-1",
			cliente: 1,
			nome: "Cliente PDV",
		} as never);
		vi.mocked(
			condicaoPagamentoRepository.buscarCondicaoPagamentoPorId,
		).mockResolvedValue({
			id: "cond-1",
			parcelas: 3,
			prazos: "0,30,60",
		} as never);
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-boleto",
			aprazo: 1,
			integracaixabanco: 0,
			prazodias: 30,
			idplanocontas: "plano-1",
		} as never);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-novo",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			idcondicaopagto: "cond-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-boleto", valor: 300 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(3);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(3);
	});

	it("é idempotente quando já existem títulos", async () => {
		vi.mocked(
			financeiroRepository.buscarFinanceirosPorOrigem,
		).mockResolvedValue([{ id: "fin-existente" } as never]);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(0);
	});
});
