import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as inutilizarService from "@/service/nfe-emissao/inutilizar-nfe-venda.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { inutilizarNfceVendaPdvService } from "./inutilizar-nfce-venda-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/nfe-emissao/inutilizar-nfe-venda.js");

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

describe("inutilizarNfceVendaPdvService", () => {
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
			status: NFE_STATUS.REJEITADA,
			serie: "1",
			numeronotafiscal: "10",
		} as never);
		vi.mocked(inutilizarService.inutilizarNfeVendaService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				idnotafiscal: "nfce-1",
				status: NFE_STATUS.INUTILIZADA,
				cStat: "102",
			},
		});
	});

	it("inutiliza a NFC-e vinculada à venda PDV", async () => {
		const resultado = await inutilizarNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			justificativa: "NFC-e rejeitada, numeração não será utilizada",
		});

		expect(resultado.success).toBe(true);
		expect(inutilizarService.inutilizarNfeVendaService).toHaveBeenCalledWith({
			idusuario: "user-1",
			idnotafiscal: "nfce-1",
			justificativa: "NFC-e rejeitada, numeração não será utilizada",
			permitirNfce: true,
		});
	});

	it("recusa venda sem NFC-e na retaguarda", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			...vendaBase,
			idnotafiscalnfce: null,
		});

		const resultado = await inutilizarNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			justificativa: "NFC-e rejeitada, numeração não será utilizada",
		});

		expect(resultado.success).toBe(false);
		expect(inutilizarService.inutilizarNfeVendaService).not.toHaveBeenCalled();
	});

	it("recusa inutilização de pendência pré-emissão sem numeração", async () => {
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nfce-1",
			modelo: "65",
			status: NFE_STATUS.REJEITADA,
			serie: null,
			numeronotafiscal: null,
		} as never);

		const resultado = await inutilizarNfceVendaPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			justificativa: "Item com valor zero",
		});

		expect(resultado).toMatchObject({
			success: false,
			status: 400,
			error: expect.stringContaining("não possui numeração fiscal"),
		});
		expect(inutilizarService.inutilizarNfeVendaService).not.toHaveBeenCalled();
	});
});
