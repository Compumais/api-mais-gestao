import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locacao, LocacaoItem } from "@/model/locacao-model.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as locacaoRepository from "@/repositories/locacao-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import { fecharLocacaoService } from "./fechar-locacao.js";

vi.mock("@/repositories/conta-corrente-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/locacao-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js", () => ({
	criarAuditoriaService: vi.fn(async () => ({ success: true, status: 201 })),
}));

const locacao: Locacao = {
	id: "loc-1",
	idempresa: "emp-1",
	identidade: "cli-1",
	codigo: "8",
	situacao: "aberta",
	datainicio: "2026-11-01",
	cep: null,
	endereco: null,
	numeroendereco: null,
	complemento: null,
	bairro: null,
	idcidade: null,
	idestado: null,
	latitude: null,
	longitude: null,
	valorperiodo: "300.00",
	valormora: "0.00",
	valortotal: "300.00",
	datadevolucao: null,
	formapagamento: null,
	vencimento: null,
	idtipodocumento: null,
	idplanocontas: null,
	idcontacorrente: null,
	idfinanceiro: null,
	observacao: null,
	criadoem: "2026-11-01T00:00:00.000Z",
	atualizadoem: "2026-11-01T00:00:00.000Z",
};

const item: LocacaoItem = {
	id: "item-1",
	idlocacao: "loc-1",
	idequipamento: "eq-1",
	periodo: "mensal",
	quantidade: 1,
	valorunitario: "300.00",
	valordiaria: "20.00",
	dataprevista: "2026-11-30",
	valorperiodo: "300.00",
	valormora: "0.00",
	valortotal: "300.00",
	diasatraso: 0,
};

describe("fecharLocacaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cli-1",
			idempresa: "emp-1",
			nome: "Cliente",
			razaosocial: "Cliente Ltda",
			cnpjcpf: "000",
		} as never);
		vi.mocked(locacaoRepository.buscarLocacaoPorIdEempresa).mockResolvedValue({
			locacao,
			nomecliente: "Cliente",
			razaosocial: "Cliente Ltda",
		});
		vi.mocked(locacaoRepository.listarItensLocacao).mockResolvedValue([
			{
				item,
				codigoequipamento: "10",
				descricaoequipamento: "Betoneira",
				numeroserie: null,
			},
		]);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue({
			id: "plano-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "doc-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(
			contaCorrenteRepository.buscarContaCorrentePorId,
		).mockResolvedValue({
			id: "conta-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(locacaoRepository.persistirFechamentoLocacao).mockImplementation(
			async (dados) =>
				({ ...locacao, ...dados, situacao: "fechada" }) as Locacao,
		);
	});

	it("no atraso gera conta a receber e não lança no caixa", async () => {
		const resultado = await fecharLocacaoService({
			id: "loc-1",
			idempresa: "emp-1",
			idusuario: "usr-1",
			datadevolucao: "2026-12-02",
			formapagamento: "prazo",
			idplanocontas: "plano-1",
			idtipodocumento: "doc-1",
			vencimento: "2026-12-10",
		});

		expect(resultado.success).toBe(true);
		const chamada = vi.mocked(locacaoRepository.persistirFechamentoLocacao).mock
			.calls[0]?.[0];
		expect(chamada?.valormora).toBe("40.00");
		expect(chamada?.valortotal).toBe("340.00");
		expect(chamada?.itens[0]?.diasatraso).toBe(2);
		expect(chamada?.financeiro?.tipo).toBe("R");
		expect(chamada?.financeiro?.tipoorigem).toBe(6);
		expect(chamada?.financeiro?.saldo).toBe("340.00");
		expect(chamada?.lancamento).toBeNull();
	});

	it("à vista lança na conta escolhida e não abre título", async () => {
		const resultado = await fecharLocacaoService({
			id: "loc-1",
			idempresa: "emp-1",
			idusuario: "usr-1",
			datadevolucao: "2026-11-30",
			formapagamento: "avista",
			idplanocontas: "plano-1",
			idcontacorrente: "conta-1",
		});

		expect(resultado.success).toBe(true);
		const chamada = vi.mocked(locacaoRepository.persistirFechamentoLocacao).mock
			.calls[0]?.[0];
		expect(chamada?.valormora).toBe("0.00");
		expect(chamada?.valortotal).toBe("300.00");
		expect(chamada?.financeiro).toBeNull();
		expect(chamada?.lancamento?.idcontacorrente).toBe("conta-1");
		expect(chamada?.lancamento?.valor).toBe(300);
		expect(chamada?.idfinanceiro).toBeNull();
	});
});
