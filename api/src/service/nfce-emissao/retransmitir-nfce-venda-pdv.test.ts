import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as emitirService from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { retransmitirNfceVendaPdvService } from "./retransmitir-nfce-venda-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nfce-emissao/emitir-nfce-venda-pdv.js");

const vendaBase: VendaPdvGourmet = {
	id: "venda-1",
	idempresa: "emp-1",
	idcontamesa: null,
	vendalocal: 3,
	numeropdv: 1,
	idvendaitem: null,
	valordinheiro: "10.00",
	valorcartao: "0.00",
	valorcartaocredito: "0.00",
	valorcartaodebito: "0.00",
	valorpix: "0.00",
	valorprepago: "0.00",
	valortroco: "0.00",
	valortotal: "10.00",
	deveemitirnfce: true,
	idnotafiscalnfce: null,
	identidade: null,
	idcondicaopagto: null,
	datacriacao: null,
	dataalteracao: null,
	usuarioquefechouvenda: "user-1",
};

describe("retransmitirNfceVendaPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue(
			vendaBase,
		);
		vi.mocked(emitirService.emitirNfceVendaPdvService).mockResolvedValue({
			success: true,
			status: 200,
			body: { emitida: true, idnotafiscal: "nf-1" },
		});
	});

	it("reemite NFC-e da venda sem nova baixa de estoque", async () => {
		const resultado = await retransmitirNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
		});

		expect(resultado.success).toBe(true);
		expect(emitirService.emitirNfceVendaPdvService).toHaveBeenCalledWith({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			pagamentos: {
				valordinheiro: "10.00",
				valorcartao: "0.00",
				valorcartaocredito: "0.00",
				valorcartaodebito: "0.00",
				valorpix: "0.00",
				valorprepago: "0.00",
				valortroco: "0.00",
				valortotal: "10.00",
			},
		});
	});

	it("recusa NFC-e já autorizada", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			...vendaBase,
			idnotafiscalnfce: "nf-1",
		});
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			status: NFE_STATUS.AUTORIZADA,
		} as never);

		const resultado = await retransmitirNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(emitirService.emitirNfceVendaPdvService).not.toHaveBeenCalled();
	});
});
