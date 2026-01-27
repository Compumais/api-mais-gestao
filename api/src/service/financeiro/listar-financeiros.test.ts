import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Financeiro } from "@/model/financeiro-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import { listarFinanceirosService } from "./listar-financeiros.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");

describe("listarFinanceirosService", () => {
	const financeirosMock: Financeiro[] = [
		{
			id: "financeiro-1",
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
		},
		{
			id: "financeiro-2",
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
			valor: "2000.00",
			saldo: "2000.00",
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
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar com array vazio quando usuário não tem empresas", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([]);

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-sem-empresas",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toEqual([]);
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
		}
		expect(financeiroRepository.listarFinanceiro).not.toHaveBeenCalled();
	});

	it("deve listar com sucesso usando valores padrão", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: financeirosMock,
			total: 2,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toEqual(financeirosMock);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(entidadeRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEmpresasDoUsuario).toHaveBeenCalledWith(
			"usuario-123",
		);
		expect(financeiroRepository.listarFinanceiro).toHaveBeenCalledTimes(1);
		expect(financeiroRepository.listarFinanceiro).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			saldo: undefined,
			emissao: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar com filtro de saldo", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: [financeirosMock[0]!],
			total: 1,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
			saldo: "1000.00",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(1);
		}
		expect(financeiroRepository.listarFinanceiro).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			saldo: "1000.00",
			emissao: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar com filtro de emissao", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: financeirosMock,
			total: 2,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
			emissao: "2024-01-01",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
		}
		expect(financeiroRepository.listarFinanceiro).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			saldo: undefined,
			emissao: "2024-01-01",
			page: 1,
			limit: 10,
		});
	});

	it("deve listar com paginação customizada", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: financeirosMock,
			total: 25,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
			page: 2,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
		expect(financeiroRepository.listarFinanceiro).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			saldo: undefined,
			emissao: undefined,
			page: 2,
			limit: 10,
		});
	});

	it("deve calcular totalPages corretamente com arredondamento para cima", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: financeirosMock,
			total: 25,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.totalPages).toBe(3); // 25 / 10 = 2.5, arredondado para cima = 3
		}
	});

	it("deve retornar 0 páginas quando total é 0", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: [],
			total: 0,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
			expect(resultado.body?.data).toEqual([]);
		}
	});

	it("deve retornar estrutura de resposta correta com data e paginacao", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(financeiroRepository.listarFinanceiro).mockResolvedValue({
			financeiros: financeirosMock,
			total: 2,
		});

		const resultado = await listarFinanceirosService({
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toHaveProperty("data");
			expect(resultado.body).toHaveProperty("paginacao");
			expect(resultado.body?.paginacao).toHaveProperty("page");
			expect(resultado.body?.paginacao).toHaveProperty("limit");
			expect(resultado.body?.paginacao).toHaveProperty("total");
			expect(resultado.body?.paginacao).toHaveProperty("totalPages");
			expect(Array.isArray(resultado.body?.data)).toBe(true);
		}
	});
});
