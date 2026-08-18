import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auditoria } from "@/model/auditoria-model.js";
import type {
	BandeiraCartao,
	NovaBandeiraCartao,
} from "@/model/bandeira-cartao-model.js";
import * as bandeiraCartaoRepository from "@/repositories/bandeira-cartao-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { criarBandeiraCartaoService } from "./criar-bandeira-cartao.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/bandeira-cartao-repositories");
vi.mock("@/service/auditoria/criar-auditoria");

describe("criarBandeiraCartaoService", () => {
	const bandeiraMock: BandeiraCartao = {
		id: "bandeira-123",
		idempresa: "empresa-123",
		codigo: "visa",
		descricao: "Visa",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const dadosMock: NovaBandeiraCartao = {
		id: "bandeira-123",
		idempresa: "empresa-123",
		codigo: "visa",
		descricao: "Visa",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const auditoriaMock: Auditoria = {
		id: "auditoria-123",
		acao: "criar_bandeira_cartao",
		recurso: "bandeira_cartao",
		idrecurso: "bandeira-123",
		idusuario: "usuario-123",
		idempresa: "empresa-123",
		metadados: {},
		criadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar bandeira quando o usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bandeiraCartaoRepository.criarBandeiraCartao).mockResolvedValue(
			bandeiraMock,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarBandeiraCartaoService({
			dadosBandeiraCartao: dadosMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(bandeiraMock);
		}
	});

	it("deve retornar 403 quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarBandeiraCartaoService({
			dadosBandeiraCartao: dadosMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(bandeiraCartaoRepository.criarBandeiraCartao).not.toHaveBeenCalled();
	});

	it("deve fazer rollback quando a auditoria falha", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bandeiraCartaoRepository.criarBandeiraCartao).mockResolvedValue(
			bandeiraMock,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: false,
			status: 500,
			error: "Erro ao criar auditoria",
			code: "INTERNAL_SERVER_ERROR",
		});
		vi.mocked(bandeiraCartaoRepository.excluirBandeiraCartao).mockResolvedValue(
			bandeiraMock,
		);

		const resultado = await criarBandeiraCartaoService({
			dadosBandeiraCartao: dadosMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		expect(bandeiraCartaoRepository.excluirBandeiraCartao).toHaveBeenCalledWith(
			"bandeira-123",
		);
	});
});
