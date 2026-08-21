import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as nfceConfigRepository from "@/repositories/nfce-configuracao-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { listarNfcePendentesService } from "./listar-nfce-pendentes.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfce-configuracao-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

const CHAVE_NFCE = "35260812345678000190650010000001011000000010";

describe("listarNfcePendentesService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			nfceConfigRepository.buscarNfceConfiguracaoPorEmpresa,
		).mockResolvedValue({ ambiente: 2 } as never);
	});

	it("completa NFC-e inutilizada sem número usando chave e venda", async () => {
		vi.mocked(notaRepository.listarNfcePorEmpresa).mockResolvedValue({
			notas: [
				{
					idnotafiscal: "nfce-vazia",
					idvenda: "8f875463-aaaa-bbbb-cccc-dddddddddddd",
					numeronotafiscal: null,
					serie: null,
					chavenfe: CHAVE_NFCE,
					protocolonfe: null,
					status: NFE_STATUS.INUTILIZADA,
					valortotalnota: "0.00",
					valortotalvenda: "18.00",
					datacriacaovenda: "2026-08-18T13:32:00-03:00",
					emissao: null,
					datahoraemissao: null,
					datainclusao: null,
					tipoambientenfe: 2,
					mensagemtransmissaonfe: null,
					codigostatusprotocolonfe: 102,
				},
			],
			total: 1,
		});

		const resultado = await listarNfcePendentesService({
			idusuario: "user-1",
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(true);
		expect(notaRepository.listarNfcePorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				tipoambientenfe: 2,
			}),
		);
		expect(resultado.body?.data[0]).toEqual(
			expect.objectContaining({
				numeronotafiscal: "101",
				serie: "1",
				valortotalnota: "18.00",
				datahoraemissao: "2026-08-18T13:32:00-03:00",
				emissao: "2026-08-18",
			}),
		);
		expect(resultado.body?.data[0]).not.toHaveProperty("valortotalvenda");
	});
});
