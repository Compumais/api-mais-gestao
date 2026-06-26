import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as consultarDistribuicao from "./consultar-distribuicao-dfe.js";
import { XML_RES_NFE } from "./__fixtures__/xml-dfe.fixtures.js";
import { sincronizarEmpresaNfeInboundService } from "./nfe-inbound-sync.service.js";
import * as nfeInboundRepo from "@/repositories/nfe-inbound-repositories.js";

vi.mock("./consultar-distribuicao-dfe.js");
vi.mock("@/repositories/nfe-inbound-repositories.js");

describe("sincronizarEmpresaNfeInboundService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve paginar NSU até igualar maxNSU", async () => {
		const gzip = gzipSync(Buffer.from(XML_RES_NFE, "utf-8")).toString("base64");

		vi.mocked(nfeInboundRepo.obterOuCriarEmpresaNfeSync).mockResolvedValue({
			idempresa: "emp-1",
			ultimonsu: "000000000000000",
			maxnsu: null,
			ultimosync: null,
			proximotentativa: null,
			sincronizando: false,
			importacaoautomatica: false,
			tentativasbackoff: 0,
		});
		vi.mocked(nfeInboundRepo.tentarMarcarSincronizando).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.liberarSincronizando).mockResolvedValue();
		vi.mocked(nfeInboundRepo.buscarNfeInboundDocumentoPorChave).mockResolvedValue(
			undefined,
		);
		vi.mocked(nfeInboundRepo.upsertNfeInboundDocumento).mockResolvedValue({
			id: "doc-1",
		} as never);
		vi.mocked(nfeInboundRepo.atualizarEmpresaNfeSync).mockResolvedValue({} as never);

		vi.mocked(consultarDistribuicao.consultarDistribuicaoDfe)
			.mockResolvedValueOnce({
				cStat: "138",
				xMotivo: "ok",
				ultNSU: "000000000000001",
				maxNSU: "000000000000002",
				docZip: [{ nsu: "000000000000001", schema: "resNFe", content: gzip }],
			})
			.mockResolvedValueOnce({
				cStat: "137",
				xMotivo: "fim",
				ultNSU: "000000000000002",
				maxNSU: "000000000000002",
				docZip: [],
			});

		const resultado = await sincronizarEmpresaNfeInboundService({
			idempresa: "emp-1",
		});

		expect(consultarDistribuicao.consultarDistribuicaoDfe).toHaveBeenCalledTimes(2);
		expect(resultado.quantidadeXml).toBe(1);
		expect(resultado.nsuFinal).toBe("000000000000002");
	});

	it("deve parar em cStat 656 com backoff", async () => {
		vi.mocked(nfeInboundRepo.obterOuCriarEmpresaNfeSync).mockResolvedValue({
			idempresa: "emp-1",
			ultimonsu: "0",
			maxnsu: null,
			ultimosync: null,
			proximotentativa: null,
			sincronizando: false,
			importacaoautomatica: false,
			tentativasbackoff: 0,
		});
		vi.mocked(nfeInboundRepo.tentarMarcarSincronizando).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.liberarSincronizando).mockResolvedValue();
		vi.mocked(nfeInboundRepo.atualizarEmpresaNfeSync).mockResolvedValue({} as never);

		vi.mocked(consultarDistribuicao.consultarDistribuicaoDfe).mockRejectedValue(
			Object.assign(new Error("Consumo indevido"), {
				name: "ErroConsultaDistribuicaoDfe",
				codigo: "BACKOFF",
				cStat: "656",
			}),
		);

		const resultado = await sincronizarEmpresaNfeInboundService({
			idempresa: "emp-1",
		});

		expect(resultado.parouPor656).toBe(true);
		expect(nfeInboundRepo.atualizarEmpresaNfeSync).toHaveBeenCalledWith(
			"emp-1",
			expect.objectContaining({ tentativasbackoff: 1 }),
		);
	});

	it("deve incluir cStat e xMotivo quando SEFAZ retorna 137 sem documentos", async () => {
		vi.mocked(nfeInboundRepo.obterOuCriarEmpresaNfeSync).mockResolvedValue({
			idempresa: "emp-1",
			ultimonsu: "000000000000000",
			maxnsu: null,
			ultimosync: null,
			proximotentativa: null,
			sincronizando: false,
			importacaoautomatica: false,
			tentativasbackoff: 0,
		});
		vi.mocked(nfeInboundRepo.tentarMarcarSincronizando).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.liberarSincronizando).mockResolvedValue();
		vi.mocked(nfeInboundRepo.atualizarEmpresaNfeSync).mockResolvedValue({} as never);

		vi.mocked(consultarDistribuicao.consultarDistribuicaoDfe).mockResolvedValueOnce({
			cStat: "137",
			xMotivo: "Nenhum documento localizado",
			ultNSU: "000000000000000",
			maxNSU: "000000000000000",
			docZip: [],
		});

		const resultado = await sincronizarEmpresaNfeInboundService({
			idempresa: "emp-1",
		});

		expect(resultado.quantidadeXml).toBe(0);
		expect(resultado.cStat).toBe("137");
		expect(resultado.xMotivo).toBe("Nenhum documento localizado");
	});

	it("deve propagar erro de gateway indisponível em falhas", async () => {
		vi.mocked(nfeInboundRepo.obterOuCriarEmpresaNfeSync).mockResolvedValue({
			idempresa: "emp-1",
			ultimonsu: "000000000000000",
			maxnsu: null,
			ultimosync: null,
			proximotentativa: null,
			sincronizando: false,
			importacaoautomatica: false,
			tentativasbackoff: 0,
		});
		vi.mocked(nfeInboundRepo.tentarMarcarSincronizando).mockResolvedValue(true);
		vi.mocked(nfeInboundRepo.liberarSincronizando).mockResolvedValue();

		vi.mocked(consultarDistribuicao.consultarDistribuicaoDfe).mockRejectedValue(
			Object.assign(
				new Error(
					"Não foi possível conectar ao gateway NF-e em http://127.0.0.1:8088. Verifique se o nfe-gateway está em execução.",
				),
				{
					name: "ErroConsultaDistribuicaoDfe",
					codigo: "GATEWAY",
				},
			),
		);

		const resultado = await sincronizarEmpresaNfeInboundService({
			idempresa: "emp-1",
		});

		expect(resultado.quantidadeXml).toBe(0);
		expect(resultado.falhas).toEqual([
			{
				nsu: "000000000000000",
				motivo:
					"Não foi possível conectar ao gateway NF-e em http://127.0.0.1:8088. Verifique se o nfe-gateway está em execução.",
			},
		]);
	});
});
