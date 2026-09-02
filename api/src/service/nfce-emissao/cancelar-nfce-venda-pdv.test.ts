import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as cancelarService from "@/service/nfe-emissao/cancelar-nfe-venda.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { cancelarNfceVendaPdvService } from "./cancelar-nfce-venda-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nfe-emissao/cancelar-nfe-venda.js");

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
	idnotafiscalnfce: "nfce-1",
	identidade: null,
	idcondicaopagto: null,
	datacriacao: null,
	dataalteracao: null,
	usuarioquefechouvenda: "user-1",
};

describe("cancelarNfceVendaPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue(
			vendaBase,
		);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nfce-1",
			modelo: "65",
			status: NFE_STATUS.AUTORIZADA,
		} as never);
		vi.mocked(cancelarService.cancelarNfeVendaService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				idnotafiscal: "nfce-1",
				status: NFE_STATUS.CANCELADA,
				cStat: "135",
			},
		});
	});

	it("cancela a NFC-e vinculada à venda PDV", async () => {
		const resultado = await cancelarNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			justificativa: "Cliente desistiu da compra após a emissão",
		});

		expect(resultado.success).toBe(true);
		expect(cancelarService.cancelarNfeVendaService).toHaveBeenCalledWith({
			idusuario: "user-1",
			idnotafiscal: "nfce-1",
			justificativa: "Cliente desistiu da compra após a emissão",
			modeloEsperado: "65",
		});
	});

	it("recusa venda sem NFC-e na retaguarda", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			...vendaBase,
			idnotafiscalnfce: null,
		});

		const resultado = await cancelarNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			justificativa: "Cliente desistiu da compra após a emissão",
		});

		expect(resultado.success).toBe(false);
		expect(cancelarService.cancelarNfeVendaService).not.toHaveBeenCalled();
	});
});
