import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as pagamentoRepository from "@/repositories/venda-pdv-pagamento-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as recebimentosService from "@/service/venda-pdv-gourmet/registrar-recebimentos-venda.js";
import { criarVendaPdvGourmetService } from "./criar-venda-pdv-gourmet.js";

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
		vi.mocked(vendaRepository.criarVendaPdvGourmet).mockResolvedValue(
			vendaBase,
		);
		vi.mocked(pagamentoRepository.criarVendaPdvPagamentos).mockResolvedValue(
			[],
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: { id: "aud-1" },
		} as never);
		vi.mocked(
			recebimentosService.registrarRecebimentosVendaService,
		).mockResolvedValue({ success: true });
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
