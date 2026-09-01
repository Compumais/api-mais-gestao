import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaMesa } from "@/model/conta-mesa-model.js";
import type { ContaMesaItem } from "@/model/conta-mesa-item-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as contaMesaRepository from "@/repositories/conta-mesa-repositories.js";
import * as contaMesaItemRepository from "@/repositories/conta-mesa-item-repositories.js";
import * as vendaPdvItemRepository from "@/repositories/venda-pdv-item-repositories.js";
import * as vendaPdvGourmetRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as criarVendaService from "@/service/venda-pdv-gourmet/criar-venda-pdv-gourmet.js";
import { fecharFatiaItensContaMesaService } from "./fechar-fatia-itens-conta-mesa.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/conta-mesa-repositories.js");
vi.mock("@/repositories/conta-mesa-item-repositories.js");
vi.mock("@/repositories/venda-pdv-item-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/venda-pdv-gourmet/criar-venda-pdv-gourmet.js");

const contaBase: ContaMesa = {
	id: "conta-1",
	idempresa: "emp-1",
	idcliente: null,
	dataabertura: null,
	desconto: "0",
	idgarcom: null,
	idusuario: "user-1",
	numeromesa: 5,
	numeropessoas: 2,
	observacao: null,
	status: 1,
	telefone: null,
	usuarioquefechouconta: null,
	valorcartao: null,
	valorcartaocredito: null,
	valorcartaodebito: null,
	valorcouverartistico: "0",
	valordinheiro: null,
	valorpendente: null,
	valorpix: null,
	valorprepago: null,
	valortaxaservico: "0",
	valortotal: null,
	valortroco: null,
	datacriacao: null,
	dataalteracao: null,
};

const itemA: ContaMesaItem = {
	id: "item-a",
	idproduto: "prod-a",
	couverartistico: 0,
	dataabertura: null,
	idcontamesa: "conta-1",
	idgarcom: "user-1",
	nomeproduto: "Cerveja",
	observacao: null,
	quantidade: "2.000",
	precopromocao: "0",
	precoalterado: "0",
	precounitario: "10.000",
	taxaservico: 0,
	pago: 0,
	unidademedida: "un-1",
};

const itemB: ContaMesaItem = {
	...itemA,
	id: "item-b",
	nomeproduto: "Refrigerante",
	quantidade: "1.000",
	precounitario: "8.000",
};

const vendaBase: VendaPdvGourmet = {
	id: "venda-1",
	idempresa: "emp-1",
	idcontamesa: "conta-1",
	vendalocal: 1,
	numeropdv: 1,
	idvendaitem: null,
	valordinheiro: "28.00",
	valorcartao: "0.00",
	valorcartaocredito: "0.00",
	valorcartaodebito: "0.00",
	valorpix: "0.00",
	valorprepago: "0.00",
	valortroco: "0.00",
	valortotal: "28.00",
	deveemitirnfce: false,
	idnotafiscalnfce: null,
	identidade: null,
	idcondicaopagto: null,
	datacriacao: null,
	dataalteracao: null,
	usuarioquefechouvenda: "user-1",
};

describe("fecharFatiaItensContaMesaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaMesaRepository.buscarContaMesaPorId).mockResolvedValue(
			contaBase,
		);
		vi.mocked(
			contaMesaItemRepository.listarItensPendentesPorConta,
		).mockResolvedValue([itemA, itemB]);
		vi.mocked(contaMesaItemRepository.buscarItensPorIds).mockImplementation(
			async (ids) => [itemA, itemB].filter((item) => ids.includes(item.id)),
		);
		vi.mocked(criarVendaService.criarVendaPdvGourmetService).mockResolvedValue({
			success: true,
			status: 201,
			body: vendaBase,
		});
		vi.mocked(vendaPdvItemRepository.criarVendaPdvItem).mockResolvedValue(
			{} as never,
		);
		vi.mocked(contaMesaItemRepository.marcarItensComoPagos).mockResolvedValue(
			[],
		);
		vi.mocked(contaMesaRepository.atualizarContaMesa).mockResolvedValue({
			...contaBase,
			status: 2,
		});
	});

	it("rejeita item já pago", async () => {
		vi.mocked(contaMesaItemRepository.buscarItensPorIds).mockResolvedValue([
			{ ...itemA, pago: 1 },
		]);

		const resultado = await fecharFatiaItensContaMesaService({
			contaMesaId: "conta-1",
			idusuario: "user-1",
			idempresa: "emp-1",
			numeropdv: 1,
			idsItens: ["item-a"],
			pagamento: { valordinheiro: "20.00" },
		});

		expect(resultado.success).toBe(false);
		expect(resultado.code).toBe("ITEM_JA_PAGO");
	});

	it("marca todos os itens pagos sem fechar a mesa", async () => {
		vi.mocked(contaMesaItemRepository.contarItensPendentes).mockResolvedValue(0);
		vi.mocked(contaMesaRepository.atualizarContaMesa).mockResolvedValue(
			contaBase,
		);

		const resultado = await fecharFatiaItensContaMesaService({
			contaMesaId: "conta-1",
			idusuario: "user-1",
			idempresa: "emp-1",
			numeropdv: 1,
			idsItens: ["item-a", "item-b"],
			pagamento: { valordinheiro: "28.00" },
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.contaFechada).toBe(false);
		expect(resultado.body?.todosItensPagos).toBe(true);
		expect(contaMesaRepository.atualizarContaMesa).toHaveBeenCalledWith(
			"conta-1",
			expect.objectContaining({
				desconto: "0.00",
				valortaxaservico: "0.00",
				valorcouverartistico: "0.00",
			}),
		);
		expect(contaMesaRepository.atualizarContaMesa).toHaveBeenCalledWith(
			"conta-1",
			expect.not.objectContaining({ status: 2 }),
		);
	});

	it("mantém a conta aberta em fatia parcial", async () => {
		vi.mocked(contaMesaItemRepository.contarItensPendentes).mockResolvedValue(1);
		vi.mocked(contaMesaRepository.atualizarContaMesa).mockResolvedValue(
			contaBase,
		);

		const resultado = await fecharFatiaItensContaMesaService({
			contaMesaId: "conta-1",
			idusuario: "user-1",
			idempresa: "emp-1",
			numeropdv: 1,
			idsItens: ["item-a"],
			pagamento: { valordinheiro: "20.00" },
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.contaFechada).toBe(false);
		expect(contaMesaRepository.atualizarContaMesa).toHaveBeenCalledWith(
			"conta-1",
			expect.not.objectContaining({ status: 2 }),
		);
	});

	it("normaliza campos de pagamento vazios antes de criar a venda", async () => {
		vi.mocked(contaMesaItemRepository.contarItensPendentes).mockResolvedValue(1);

		await fecharFatiaItensContaMesaService({
			contaMesaId: "conta-1",
			idusuario: "user-1",
			idempresa: "emp-1",
			numeropdv: 1,
			idsItens: ["item-a"],
			pagamento: {
				valordinheiro: "648.53",
				valorcartao: "",
				valorcartaocredito: "113.12",
				valorcartaodebito: "",
				valorpix: "",
				valorprepago: "",
			},
		});

		expect(criarVendaService.criarVendaPdvGourmetService).toHaveBeenCalledWith(
			expect.objectContaining({
				dadosVendaPdvGourmet: expect.objectContaining({
					valordinheiro: "648.53",
					valorcartao: "0.00",
					valorcartaocredito: "113.12",
					valorcartaodebito: "0.00",
					valorpix: "0.00",
					valorprepago: "0.00",
				}),
			}),
		);
	});
});
