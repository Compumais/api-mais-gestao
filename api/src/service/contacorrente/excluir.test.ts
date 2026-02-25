import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { excluirContaCorrenteService } from "./excluir.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/conta-corrente-repositories");

describe("excluirContaCorrenteService", () => {
	const contaCorrenteMock: ContaCorrente = {
		id: "conta-corrente-123",
		idempresa: "empresa-123",
		descricao: "Conta Corrente Principal",
		agencia: "1234",
		cnpj: "12.345.678/0001-90",
		numeroconta: "56789-0",
		abertura: "2024-01-01",
		observacao: "Conta principal da empresa",
		nometitular: "Empresa XYZ",
		cnpjcpftitular: "12.345.678/0001-90",
		gerente: "João Silva",
		telefonegerente: "(34) 9999-9999",
		codigo: 1,
		idbanco: "1",
		agenciadv: null,
		contadv: null,
		codigocedente: null,
		codigocedentedv: null,
		carteira: null,
		operacao: null,
		aceite: null,
		nossonumeroseq: null,
		codigofornecidoagencia: null,
		codigofornecidoagenciadv: null,
		instrucao1: null,
		instrucao2: null,
		instrucao3: null,
		instrucao4: null,
		especiedocumento: null,
		tamanhocodigobarras: null,
		tipoimpressao: null,
		bancoemiteboleto: null,
		arquivolicenca: null,
		diasprotesto: null,
		layoutarquivoremessa: null,
		sequenciaremessa: null,
		outrodadoconfiguracao1: null,
		outrodadoconfiguracao2: null,
		layoutarquivoretorno: null,
		layoutboleto: null,
		caixa: null,
		idfilial: null,
		codigoinstrucao1: null,
		codigoinstrucao2: null,
		codigoinstrucao3: null,
		currenttimemillis: null,
		aceitecobrebem: null,
		layoutboletopredefinido: null,
		nomearquivoremessa: null,
		formatoarquivo: null,
		alturapapelboleto: null,
		margemsuperiorboleto: null,
		margemesquerdaboleto: null,
		naogerarmensagemprotesto: null,
		naogerarmensagemjuros: null,
		naogerarmensagemmulta: null,
		naogerarinstrucaocaixaremessa: null,
		localpagamentoboleto: null,
		dadoscedentecomprovantesacado: null,
		naousarfatorvencimento: null,
		valorinstrucao1: null,
		valorinstrucao2: null,
		valorinstrucao3: null,
		processaretornonumerodocumento: null,
		razaosocial: null,
		cep: null,
		idestado: null,
		idcidade: null,
		endereco: null,
		numeroendereco: null,
		bairro: null,
		inativo: null,
		bancogeranossonumero: null,
		emissaoboleto: null,
		distribuicaoboleto: null,
		tipoprotesto: null,
		tipojuros: null,
		tipomulta: null,
		naogerarregistrodetalhe3: null,
		postobeneficiario: null,
		tipoimpressaouboleto: null,
		tipoidentificacaobeneficiario: null,
		tipoidentificacaoentidade: null,
		caminhoimagemboleto: null,
		redimensionarimagemboleto: null,
		localimpressaoinstrucaouboleto: null,
		caixapadrao: null,
		numerobeneficiarioboleto: null,
		numeroversaolayoutarquivo: null,
		numeroversaolayoutlote: null,
		idconveniado: null,
		idcontacontabilintegracao: null,
		valoracrescimo: null,
		codificacaoarquivoremessa: null,
		jurosencargos: null,
		multaencargos: null,
		imagemboleto: null,
		tipovalidacaoarquivoretorno: null,
		codigooperacao: null,
		geracaonossonumero: null,
		calcularencargosfinanceiros: null,
		descontoantecipacao: null,
		desconsiderasabado: null,
		desconsideradomingo: null,
		diasdesconsiderarjuros: null,
		diasdesconsiderarmulta: null,
		diasdesconsiderardesconto: null,
		receberpixpdv: null,
		chavepix: null,
		identidade: null,
		tipointegracao: null,
		chaveapi: null,
		tipoambienteintegracao: null,
		idcertificadointegracao: null,
		diaslimitepagamento: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir conta corrente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(contaCorrenteMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			contaCorrenteMock,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledTimes(1);
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(
			1,
		);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
	});

	it("deve retornar erro 404 quando conta corrente não é encontrada", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(undefined);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-inexistente",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledTimes(1);
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledWith({
			id: "conta-corrente-inexistente",
		});
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(contaCorrenteMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna null", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(contaCorrenteMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(
			1,
		);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(contaCorrenteMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			contaCorrenteMock,
		);

		await excluirContaCorrenteService({
			id: "conta-corrente-123",
			idusuario: "usuario-123",
		});

		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(
			1,
		);
		expect(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
	});

	it("deve retornar erro 404 quando conta corrente é null na busca inicial", async () => {
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue(null as any);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-null",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});
});
