import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Equipamento } from "@/model/equipamento-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as equipamentoRepository from "@/repositories/equipamento-repositories.js";
import * as locacaoRepository from "@/repositories/locacao-repositories.js";
import * as proximoCodigoRepository from "@/repositories/proximo-codigo-repositories.js";
import { criarLocacaoService } from "./criar-locacao.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/equipamento-repositories.js");
vi.mock("@/repositories/locacao-repositories.js");
vi.mock("@/repositories/proximo-codigo-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

const equipamento: Equipamento = {
	id: "eq-1",
	idempresa: "emp-1",
	codigo: "10",
	descricao: "Betoneira",
	numeroserie: null,
	situacao: "alocado",
	precodiaria: "50.00",
	precosemanal: "250.00",
	precoquinzenal: "400.00",
	precomensal: "700.00",
	observacao: null,
	criadoem: "2026-11-01T00:00:00.000Z",
	atualizadoem: "2026-11-01T00:00:00.000Z",
};

describe("criarLocacaoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue({
			id: "cli-1",
			idempresa: "emp-1",
			cliente: 1,
		} as never);
		vi.mocked(equipamentoRepository.buscarEquipamentosPorIds).mockResolvedValue(
			[equipamento],
		);
		vi.mocked(
			proximoCodigoRepository.buscarProximoCodigoLocacao,
		).mockResolvedValue("1");
	});

	it("recusa equipamento que não está disponível", async () => {
		const resultado = await criarLocacaoService({
			idempresa: "emp-1",
			idusuario: "usr-1",
			identidade: "cli-1",
			datainicio: "2026-11-01",
			itens: [{ idequipamento: "eq-1", periodo: "mensal", quantidade: 1 }],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error).toContain("não está disponível");
		}
		expect(locacaoRepository.salvarLocacaoAberta).not.toHaveBeenCalled();
	});
});
