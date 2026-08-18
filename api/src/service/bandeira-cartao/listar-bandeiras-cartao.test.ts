import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BandeiraCartao } from "@/model/bandeira-cartao-model.js";
import * as bandeiraCartaoRepository from "@/repositories/bandeira-cartao-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { listarBandeirasCartaoService } from "./listar-bandeiras-cartao.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/bandeira-cartao-repositories");

describe("listarBandeirasCartaoService", () => {
	const bandeiraMock: BandeiraCartao = {
		id: "bandeira-123",
		idempresa: "empresa-123",
		codigo: "visa",
		descricao: "Visa",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar bandeiras paginadas", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bandeiraCartaoRepository.listarBandeirasCartao).mockResolvedValue(
			{
				bandeiras: [bandeiraMock],
				total: 1,
			},
		);

		const resultado = await listarBandeirasCartaoService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toEqual([bandeiraMock]);
			expect(resultado.body?.paginacao.total).toBe(1);
		}
	});

	it("deve retornar 403 quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarBandeirasCartaoService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
	});
});
