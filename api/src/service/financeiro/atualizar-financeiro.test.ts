import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Financeiro } from "@/model/financeiro-model.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import { atualizarFinanceiroService } from "./atualizar-financeiro.js";

vi.mock("@/repositories/financeiro-repositories.js");

describe("atualizarFinanceiroService", () => {
	const financeiroMock: Financeiro = {
		id: "financeiro-123",
		idempresa: "empresa-123",
		identidade: null,
		tipo: null,
		tipoorigem: null,
		idorigem: null,
		parcela: null,
		documento: null,
		idtipodocumentofinanceiro: null,
		status: null,
		emissao: null,
		vencimento: null,
		vencimentooriginal: null,
		pagamento: null,
		baixa: null,
		valor: "1000.00",
		saldo: "1000.00",
		historico: null,
		idbanco: null,
		agencia: null,
		numerocontacorrente: null,
		cnpjcpfemitente: null,
		emitente: null,
		identidadedestino: null,
		idcodigocontabil: null,
		juros: 0,
		multa: 0,
		taxafinanciamento: 0,
		evento: null,
		devolucaocodigo: null,
		devolucaodescricao: null,
		devolucaodata: null,
		protestodate: null,
		nossonumero: null,
		idcontageraboleto: null,
		idpagamentoapi: null,
		acaoprocessamentoretorno: null,
		autenticacaopagamentoapi: null,
		codigobarras: null,
		idtipocobranca: null,
		idrepresentante: null,
		percentualcomissaofaturamento: null,
		percentualcomissaoquitacao: null,
		codigodigitado: null,
		codigoecommerce: null,
		baixa2: null,
		codigopedidoecommerce: null,
		datareferencia: null,
		dataliberacaousuariosupervisor: null,
		diasinstrucaocobrancaboleto: null,
		dvnossonumero: null,
		totalparcelas: null,
		entrada: null,
		extra1: null,
		extra2: null,
		extra3: null,
		extra4: null,
		extra5: null,
		extra6: null,
		extra7: null,
		extra8: null,
		extra9: null,
		extra10: null,
		extra11: null,
		extra12: null,
		extra13: null,
		extra14: null,
		extra15: null,
		extra16: null,
		idadministradora: null,
		idbandeira: null,
		idcarteirageradauboleto: null,
		idconfiguracaoecommerce: null,
		iddependente: null,
		idportador: null,
		idrepresentante2: null,
		urlqrcode: null,
		instrucaocobrancaboleto: null,
		nomebandeira: null,
		idusuariosupervisor: null,
		jsonretornodocumento: null,
		nomeadministradora: null,
		observacaoboleto: null,
		numerocheque: null,
		remessagerada: null,
		boletoimpresso: null,
		currenttimemillis: null,
		vencimentocalculoencargos: null,
		percentualcomissaoquitacao2: null,
		referenciaparceiro: null,
		valorpagorecebido: null,
		valororiginalcomissao2: null,
		valororiginalcomissao: null,
		valorbasecomissao: null,
		urldocumento: null,
		registro: null,
		saldocomissao: null,
		saldocomissao2: null,
		statuscobrancaonline: null,
		statusjob: null,
		tipointegracao: null,
		tiporateiocentrocusto: null,
		ultimaocorrenciabancaria: null,
	};

	const financeiroAtualizadoMock: Financeiro = {
		...financeiroMock,
		valor: "2000.00",
		saldo: "2000.00",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar financeiro existente com sucesso", async () => {
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroMock,
		);
		vi.mocked(financeiroRepository.atualizarFinanceiro).mockResolvedValue(
			financeiroAtualizadoMock,
		);

		const resultado = await atualizarFinanceiroService({
			id: "financeiro-123",
			dados: {
				valor: "2000.00",
				saldo: "2000.00",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(financeiroAtualizadoMock);
		}
		expect(financeiroRepository.buscarFinanceiroPorId).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.buscarFinanceiroPorId).toHaveBeenCalledWith(
			"financeiro-123",
		);
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledWith(
			"financeiro-123",
			{
				valor: "2000.00",
				saldo: "2000.00",
			},
		);
	});

	it("deve retornar erro 404 quando financeiro não é encontrado na busca inicial", async () => {
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarFinanceiroService({
			id: "financeiro-inexistente",
			dados: {
				valor: "2000.00",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(financeiroRepository.buscarFinanceiroPorId).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.buscarFinanceiroPorId).toHaveBeenCalledWith(
			"financeiro-inexistente",
		);
		expect(financeiroRepository.atualizarFinanceiro).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando atualização retorna undefined", async () => {
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroMock,
		);
		vi.mocked(financeiroRepository.atualizarFinanceiro).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarFinanceiroService({
			id: "financeiro-123",
			dados: {
				valor: "2000.00",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(financeiroRepository.buscarFinanceiroPorId).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledTimes(1);
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroMock,
		);
		vi.mocked(financeiroRepository.atualizarFinanceiro).mockResolvedValue({
			...financeiroMock,
			valor: "3000.00",
		});

		const resultado = await atualizarFinanceiroService({
			id: "financeiro-123",
			dados: {
				valor: "3000.00",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.valor).toBe("3000.00");
		}
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledWith(
			"financeiro-123",
			{
				valor: "3000.00",
			},
		);
	});
});
