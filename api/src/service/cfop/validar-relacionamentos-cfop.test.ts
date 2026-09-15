import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cfopRepository from "@/repositories/cfop-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import { validarRelacionamentosCfop } from "@/service/cfop/validar-relacionamentos-cfop.js";

vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js");

describe("validarRelacionamentosCfop", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("aceita relacionamentos da mesma empresa", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue({
			id: "plano-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(
			tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId,
		).mockResolvedValue({
			id: "tipo-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(cfopRepository.buscarCfopPorId).mockResolvedValue({
			id: "cfop-2",
			idempresa: "emp-1",
		} as never);

		const resultado = await validarRelacionamentosCfop({
			idempresa: "emp-1",
			cfopIdAtual: "cfop-1",
			relacionamentos: {
				idplanocontas: "plano-1",
				idtipodocumentofinanceiro: "tipo-1",
				idnaturezaoperacaoinversa: "cfop-2",
			},
		});

		expect(resultado).toBeNull();
	});

	it("rejeita plano de contas de outra empresa", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue({
			id: "plano-1",
			idempresa: "outra",
		} as never);

		const resultado = await validarRelacionamentosCfop({
			idempresa: "emp-1",
			relacionamentos: {
				idplanocontas: "plano-1",
			},
		});

		expect(resultado?.success).toBe(false);
		expect(resultado?.error).toContain("Plano de contas");
	});

	it("rejeita auto-referência da natureza", async () => {
		const resultado = await validarRelacionamentosCfop({
			idempresa: "emp-1",
			cfopIdAtual: "cfop-1",
			relacionamentos: {
				idnaturezadevolucao: "cfop-1",
			},
		});

		expect(resultado?.success).toBe(false);
		expect(resultado?.error).toContain("própria natureza");
	});
});
