import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Financeiro } from "@/model/financeiro-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import { criarFinanceiroService } from "./criar-financeiro.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/financeiro-repositories");

describe("criarFinanceiroService", () => {
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
		valor: "0.00",
		saldo: "0.00",
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
		idplanocontas: null,
	};

	const dadosFinanceiroMock = {
		id: "financeiro-123",
		idempresa: "empresa-123",
		valor: "1000.00",
		saldo: "1000.00",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar financeiro com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue(
			financeiroMock,
		);

		const resultado = await criarFinanceiroService({
			dadosFinanceiro: dadosFinanceiroMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(financeiroMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledWith(
			dadosFinanceiroMock,
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarFinanceiroService({
			dadosFinanceiro: dadosFinanceiroMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.criarFinanceiro).not.toHaveBeenCalled();
	});

	it("deve retornar erro 400 quando criação retorna null", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue(
			null as unknown as Financeiro,
		);

		const resultado = await criarFinanceiroService({
			dadosFinanceiro: dadosFinanceiroMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toBe("Erro ao processar a requisição");
			expect(resultado.code).toBe("BAD_REQUEST_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 400 quando criação retorna undefined", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue(
			undefined as unknown as Financeiro,
		);

		const resultado = await criarFinanceiroService({
			dadosFinanceiro: dadosFinanceiroMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toBe("Erro ao processar a requisição");
			expect(resultado.code).toBe("BAD_REQUEST_ERROR");
		}
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(1);
	});

	it("deve verificar permissão antes de criar financeiro", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue(
			financeiroMock,
		);

		await criarFinanceiroService({
			dadosFinanceiro: dadosFinanceiroMock,
			idusuario: "usuario-123",
		});

		const calls = vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa)
			.mock.calls;
		const criarCalls = vi.mocked(financeiroRepository.criarFinanceiro).mock
			.calls;

		expect(calls.length).toBeGreaterThan(0);
		expect(criarCalls.length).toBeGreaterThan(0);
	});
});
