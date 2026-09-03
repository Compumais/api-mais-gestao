import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as auditoriaRepository from "@/repositories/auditoria-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as pagamentoRepository from "@/repositories/venda-pdv-pagamento-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as contasReceberService from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";
import * as recebimentosService from "@/service/venda-pdv-gourmet/registrar-recebimentos-venda.js";
import { criarVendaPdvGourmetService } from "./criar-venda-pdv-gourmet.js";

vi.mock("@/repositories/auditoria-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/repositories/venda-pdv-pagamento-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/venda-pdv-gourmet/registrar-recebimentos-venda.js");
vi.mock("@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js");

const vendaBase: VendaPdvGourmet = {
	id: "venda-1",
	idempresa: "emp-1",
	idcontamesa: null,
	vendalocal: 2,
	numeropdv: 1,
	idvendalocal: null,
	idvendaitem: null,
	valordinheiro: "0.00",
	valorcartao: "0.00",
	valorcartaocredito: "100.00",
	valorcartaodebito: "0.00",
	valorpix: "0.00",
	valorprepago: "0.00",
	valortroco: "0.00",
	valortotal: "100.00",
	deveemitirnfce: false,
	idnotafiscalnfce: null,
	identidade: null,
	idcondicaopagto: null,
	datacriacao: null,
	dataalteracao: null,
	usuarioquefechouvenda: "user-1",
};

describe("criarVendaPdvGourmetService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(vendaRepository.executarComLockVendaPdvLocal).mockImplementation(
			async (_idempresa, _numeropdv, _idvendalocal, executar) => executar(),
		);
		vi.mocked(vendaRepository.criarOuBuscarVendaPdvGourmet).mockResolvedValue({
			registro: vendaBase,
			criada: true,
		});
		vi.mocked(
			pagamentoRepository.listarVendaPdvPagamentosPorVenda,
		).mockResolvedValue([]);
		vi.mocked(pagamentoRepository.criarVendaPdvPagamentos).mockResolvedValue(
			[],
		);
		vi.mocked(auditoriaRepository.buscarAuditoriaPorRecurso).mockResolvedValue(
			undefined,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: { id: "aud-1" },
		} as never);
		vi.mocked(
			recebimentosService.registrarRecebimentosVendaService,
		).mockResolvedValue({ success: true });
		vi.mocked(
			contasReceberService.inferirPagamentosErpVendaPdv,
		).mockResolvedValue([]);
		vi.mocked(contasReceberService.formaErpExigeCliente).mockResolvedValue(
			false,
		);
		vi.mocked(
			contasReceberService.gerarContasReceberVendaPdvService,
		).mockResolvedValue({
			success: true,
			status: 200,
			body: { parcelasGeradas: 0 },
		} as never);
	});

	it("repara efeitos ausentes sem duplicar pagamentos existentes", async () => {
		vi.mocked(vendaRepository.criarOuBuscarVendaPdvGourmet).mockResolvedValue({
			registro: vendaBase,
			criada: false,
		});
		vi.mocked(
			pagamentoRepository.listarVendaPdvPagamentosPorVenda,
		).mockResolvedValue([{ id: "pagamento-1" }] as never);

		const resultado = await criarVendaPdvGourmetService({
			dadosVendaPdvGourmet: {
				id: "nova-tentativa",
				idempresa: "emp-1",
				numeropdv: 1,
				idvendalocal: "local-1",
				usuarioquefechouvenda: "user-1",
			},
			idusuario: "user-1",
			pagamentos: [{ meio: "DINHEIRO", valor: 100 }],
		});

		expect(resultado.success).toBe(true);
		expect(pagamentoRepository.criarVendaPdvPagamentos).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(
			recebimentosService.registrarRecebimentosVendaService,
		).toHaveBeenCalledTimes(1);
		expect(
			contasReceberService.gerarContasReceberVendaPdvService,
		).not.toHaveBeenCalled();
	});

	it("persiste NSU e o segundo cartão", async () => {
		const resultado = await criarVendaPdvGourmetService({
			dadosVendaPdvGourmet: {
				id: "venda-1",
				idempresa: "emp-1",
				numeropdv: 1,
				usuarioquefechouvenda: "user-1",
				valortotal: "100.00",
			},
			idusuario: "user-1",
			pagamentos: [
				{
					meio: "CARTAO",
					valor: 60,
					nsu: "111",
					autorizacao: "A1",
					bandeira: "VISA",
					status: "ok",
				},
				{
					meio: "CARTAO",
					valor: 40,
					nsu: "222",
					autorizacao: "A2",
					bandeira: "MASTER",
					status: "ok",
				},
			],
		});

		expect(resultado.success).toBe(true);
		expect(pagamentoRepository.criarVendaPdvPagamentos).toHaveBeenCalledTimes(
			1,
		);
		const gravados = vi.mocked(pagamentoRepository.criarVendaPdvPagamentos).mock
			.calls[0]?.[0];
		expect(gravados).toHaveLength(2);
		expect(gravados?.[0]).toMatchObject({
			idvenda: "venda-1",
			meio: "CARTAO",
			valor: "60.00",
			nsu: "111",
			autorizacao: "A1",
			bandeira: "VISA",
		});
		expect(gravados?.[1]).toMatchObject({
			nsu: "222",
			autorizacao: "A2",
			valor: "40.00",
		});
	});
});
