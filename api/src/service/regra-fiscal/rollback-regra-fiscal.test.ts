import { beforeEach, describe, expect, it, vi } from "vitest";
import { rollbackRegraFiscalService } from "./rollback-regra-fiscal.js";

vi.mock("@/repositories/regra-fiscal-repositories.js", () => ({
	buscarRegraFiscalPorId: vi.fn(),
	buscarHistoricoRegraFiscal: vi.fn(),
	criarHistoricoRegraFiscal: vi.fn(),
	atualizarRegraFiscal: vi.fn(),
}));

import * as repo from "@/repositories/regra-fiscal-repositories.js";

describe("rollbackRegraFiscalService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("restaura snapshot do histórico e incrementa versão", async () => {
		vi.mocked(repo.buscarRegraFiscalPorId).mockResolvedValue({
			id: "regra-1",
			ruleid: "MG-X",
			descricao: "atual",
			prioridade: 1,
			vigenciainicio: "2024-01-01",
			vigenciafim: null,
			condicoes: {},
			resultado: { st_aplicavel: true },
			fontes: [],
			status: "validado",
			versao: 2,
			idempresa: null,
			validadoem: "2024-01-02",
			validadopor: "user-1",
			criadoem: "2024-01-01",
			atualizadoem: "2024-01-02",
		});
		vi.mocked(repo.buscarHistoricoRegraFiscal).mockResolvedValue({
			id: "hist-1",
			idregrafiscal: "regra-1",
			versao: 1,
			snapshot: {
				descricao: "anterior",
				prioridade: 50,
				vigenciainicio: "2020-01-01",
				vigenciafim: null,
				condicoes: { ncm: "22084000" },
				resultado: { st_aplicavel: false },
				fontes: [{ orgao: "SEF/MG" }],
			},
			criadoem: "2024-01-01",
			idusuario: null,
		});
		vi.mocked(repo.atualizarRegraFiscal).mockResolvedValue({
			id: "regra-1",
			ruleid: "MG-X",
			descricao: "anterior",
			prioridade: 50,
			vigenciainicio: "2020-01-01",
			vigenciafim: null,
			condicoes: { ncm: "22084000" },
			resultado: { st_aplicavel: false },
			fontes: [{ orgao: "SEF/MG" }],
			status: "pendente_revisao",
			versao: 3,
			idempresa: null,
			validadoem: null,
			validadopor: null,
			criadoem: "2024-01-01",
			atualizadoem: "2026-08-20",
		});

		const resultado = await rollbackRegraFiscalService({
			id: "regra-1",
			versao: 1,
			idusuario: "user-2",
		});

		expect(resultado.success).toBe(true);
		expect(repo.criarHistoricoRegraFiscal).toHaveBeenCalled();
		expect(repo.atualizarRegraFiscal).toHaveBeenCalledWith(
			"regra-1",
			expect.objectContaining({
				descricao: "anterior",
				versao: 3,
				status: "pendente_revisao",
				validadoem: null,
			}),
		);
	});
});
