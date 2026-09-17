import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as serieRepository from "@/repositories/nfe-serie-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { criarNfeSerieService, listarNfeSeriesService } from "./nfe-serie.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nfe-serie-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

describe("séries fiscais por ambiente", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(notaRepository.buscarUltimoNumeroPorSeries).mockResolvedValue(
			new Map(),
		);
	});

	it("lista somente as séries do ambiente solicitado", async () => {
		vi.mocked(serieRepository.listarNfeSeriesPorEmpresa).mockResolvedValue([]);

		await listarNfeSeriesService({
			idempresa: "empresa",
			idusuario: "usuario",
			modelo: "55",
			ambiente: 2,
		});

		expect(serieRepository.listarNfeSeriesPorEmpresa).toHaveBeenCalledWith(
			"empresa",
			"55",
			2,
		);
	});

	it("permite a mesma série quando o ambiente é diferente", async () => {
		vi.mocked(serieRepository.buscarNfeSerieDuplicada).mockResolvedValue(
			undefined,
		);
		vi.mocked(serieRepository.criarNfeSerie).mockResolvedValue({
			id: "serie-homologacao",
			idempresa: "empresa",
			modelo: "55",
			serie: "1",
			ambiente: 2,
			numeroproximo: 62,
			padrao: true,
			ativo: true,
			criadoem: "2026-09-17T00:00:00.000Z",
			atualizadoem: "2026-09-17T00:00:00.000Z",
		});

		const resultado = await criarNfeSerieService({
			idempresa: "empresa",
			idusuario: "usuario",
			dados: {
				modelo: "55",
				serie: "1",
				ambiente: 2,
				numeroproximo: 62,
				padrao: true,
			},
		});

		expect(serieRepository.buscarNfeSerieDuplicada).toHaveBeenCalledWith(
			"empresa",
			"55",
			"1",
			2,
		);
		expect(serieRepository.desmarcarSeriesPadrao).toHaveBeenCalledWith(
			"empresa",
			"55",
			2,
		);
		expect(resultado.success).toBe(true);
	});
});
