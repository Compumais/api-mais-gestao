import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfceConfigRepository from "@/repositories/nfce-configuracao-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import * as reemitir from "./reemitir-nfce.js";
import { transmitirNfcePendentesLoteService } from "./transmitir-nfce-pendentes-lote.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfce-configuracao-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("./reemitir-nfce.js");

describe("transmitirNfcePendentesLoteService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({ ambiente: 2 } as never);
	});

	it("retorna proibido quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await transmitirNfcePendentesLoteService({
			idusuario: "user-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(notaRepository.listarNfcePorEmpresa).not.toHaveBeenCalled();
	});

	it("transmite pendentes e agrega sucesso/falha", async () => {
		vi.mocked(notaRepository.listarNfcePorEmpresa).mockResolvedValue({
			notas: [
				{
					idnotafiscal: "n1",
					idvenda: "v1",
					numeronotafiscal: "10",
					serie: "1",
					chavenfe: null,
					protocolonfe: null,
					status: NFE_STATUS.PENDENTE,
					valortotalnota: "10.00",
					valortotalvenda: "10.00",
					datacriacaovenda: null,
					emissao: null,
					datahoraemissao: null,
					datainclusao: null,
					tipoambientenfe: 2,
					mensagemtransmissaonfe: null,
					codigostatusprotocolonfe: null,
				},
				{
					idnotafiscal: "n2",
					idvenda: "v2",
					numeronotafiscal: "11",
					serie: "1",
					chavenfe: null,
					protocolonfe: null,
					status: NFE_STATUS.PENDENTE,
					valortotalnota: "20.00",
					valortotalvenda: "20.00",
					datacriacaovenda: null,
					emissao: null,
					datahoraemissao: null,
					datainclusao: null,
					tipoambientenfe: 2,
					mensagemtransmissaonfe: null,
					codigostatusprotocolonfe: null,
				},
			],
			total: 2,
		});

		vi.mocked(reemitir.reemitirNfceService)
			.mockResolvedValueOnce({
				success: true,
				status: 200,
				body: { emitida: true, idnotafiscal: "n1" },
			} as never)
			.mockResolvedValueOnce({
				success: true,
				status: 200,
				body: {
					emitida: false,
					xMotivo: "Rejeicao SEFAZ",
					idnotafiscal: "n2",
				},
			} as never);

		const resultado = await transmitirNfcePendentesLoteService({
			idusuario: "user-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				total: 2,
				autorizadas: 1,
				falhas: 1,
			}),
		);
		expect(resultado.body?.itens[0]?.sucesso).toBe(true);
		expect(resultado.body?.itens[1]?.sucesso).toBe(false);
		expect(resultado.body?.itens[1]?.mensagem).toContain("Rejeicao");
		expect(notaRepository.listarNfcePorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				status: NFE_STATUS.PENDENTE,
				tipoambientenfe: 2,
				limit: 50,
			}),
		);
	});

	it("retorna lote vazio quando não há pendentes", async () => {
		vi.mocked(notaRepository.listarNfcePorEmpresa).mockResolvedValue({
			notas: [],
			total: 0,
		});

		const resultado = await transmitirNfcePendentesLoteService({
			idusuario: "user-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual({
			total: 0,
			autorizadas: 0,
			falhas: 0,
			itens: [],
		});
		expect(reemitir.reemitirNfceService).not.toHaveBeenCalled();
	});
});
