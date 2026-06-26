import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as condicaoPagamentoRepository from "@/repositories/condicao-pagamento-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import { gerarContasReceberVendaPdvService } from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";

vi.mock("@/repositories/condicao-pagamento-repositories.js");
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
		vi.mocked(financeiroRepository.buscarFinanceirosPorOrigem).mockResolvedValue(
			[],
		);
	});

	it("rejeita pagamento a prazo sem identidade", async () => {
		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "",
			pagamentosErp: [
				{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 },
			],
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
		vi.mocked(tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue(
			{
				id: "tipo-boleto",
				aprazo: 1,
				integracaixabanco: 0,
				prazodias: 30,
			} as never,
		);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [
				{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 },
			],
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
		vi.mocked(tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue(
			{
				id: "tipo-boleto",
				aprazo: 1,
				integracaixabanco: 0,
				prazodias: 30,
				idplanocontas: "plano-1",
			} as never,
		);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-1",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [
				{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 },
			],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(1);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledWith(
			expect.objectContaining({
				identidade: "cliente-1",
				idorigem: "venda-1",
			}),
		);
	});

	it("gera parcelas por condição de pagamento", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cliente-1",
			idempresa: "emp-1",
			cliente: 1,
			nome: "Cliente PDV",
		} as never);
		vi.mocked(condicaoPagamentoRepository.buscarCondicaoPagamentoPorId).mockResolvedValue(
			{
				id: "cond-1",
				parcelas: 3,
				prazos: "0,30,60",
			} as never,
		);
		vi.mocked(tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue(
			{
				id: "tipo-boleto",
				aprazo: 1,
				integracaixabanco: 0,
				prazodias: 30,
				idplanocontas: "plano-1",
			} as never,
		);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-novo",
		} as never);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			idcondicaopagto: "cond-1",
			pagamentosErp: [
				{ idtipodocumentofinanceiro: "tipo-boleto", valor: 300 },
			],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(3);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(3);
	});

	it("é idempotente quando já existem títulos", async () => {
		vi.mocked(financeiroRepository.buscarFinanceirosPorOrigem).mockResolvedValue([
			{ id: "fin-existente" } as never,
		]);

		const resultado = await gerarContasReceberVendaPdvService({
			venda: vendaBase,
			idusuario: "user-1",
			identidade: "cliente-1",
			pagamentosErp: [
				{ idtipodocumentofinanceiro: "tipo-boleto", valor: 100 },
			],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(0);
	});
});
