import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as verificarPermissaoModule from "@/util/verificar-permissao.js";
import { moverPlanoContasService } from "./mover-plano-contas.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/plano-contas-repositories");
vi.mock("@/util/verificar-permissao", () => ({
	verificarPermissao: vi.fn(),
}));

function criarPlano(
	id: string,
	codigo: string,
	idplanocontas: string | null,
	inativo = 0,
): PlanoContas {
	return {
		id,
		idempresa: "empresa-123",
		codigo,
		nome: `Plano ${codigo}`,
		tipomovimento: "E",
		inativo,
		classe: null,
		currenttimemillis: null,
		centrocustoobrigatorio: null,
		tipoconta: null,
		idcontacontabilintegracao: null,
		exportaparacontabilidade: null,
		idgrupodre: null,
		idplanocontas,
	};
}

// Árvore: 1 (a) > 1 1 (b) > 1 1 1 (c); 2 (d)
const planos = [
	criarPlano("a", "1", null),
	criarPlano("b", "1 1", "a"),
	criarPlano("c", "1 1 1", "b"),
	criarPlano("d", "2", null),
];

describe("moverPlanoContasService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			planoContasRepository.listarTodosPlanoContasPorEmpresa,
		).mockResolvedValue(planos);
		vi.mocked(
			planoContasRepository.moverPlanoContasComCodigos,
		).mockResolvedValue();
	});

	it("deve mover um plano para outro pai regenerando os códigos", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[1] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "b",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: "d",
		});

		expect(resultado.success).toBe(true);

		const [id, destino, codigos] = vi.mocked(
			planoContasRepository.moverPlanoContasComCodigos,
		).mock.calls[0] as [string, string | null, { id: string; codigo: string }[]];

		expect(id).toBe("b");
		expect(destino).toBe("d");
		// b vira "2 1" (filho de d="2") e c acompanha como "2 1 1"
		expect(codigos).toContainEqual({ id: "b", codigo: "2 1" });
		expect(codigos).toContainEqual({ id: "c", codigo: "2 1 1" });
	});

	it("deve mover um plano para a raiz", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[1] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "b",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: null,
		});

		expect(resultado.success).toBe(true);

		const [, destino, codigos] = vi.mocked(
			planoContasRepository.moverPlanoContasComCodigos,
		).mock.calls[0] as [string, string | null, { id: string; codigo: string }[]];

		expect(destino).toBeNull();
		// b vai para o fim das raízes (1=a, 2=d, 3=b) e c acompanha
		expect(codigos).toContainEqual({ id: "b", codigo: "3" });
		expect(codigos).toContainEqual({ id: "c", codigo: "3 1" });
	});

	it("deve retornar 400 ao mover um plano para dentro dele mesmo", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[0] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "a",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: "a",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.code).toBe("PLANO_CONTAS_MOVER_PARA_SI_MESMO");
		}
		expect(
			planoContasRepository.moverPlanoContasComCodigos,
		).not.toHaveBeenCalled();
	});

	it("deve retornar 400 ao mover um plano para dentro de um descendente", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[0] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "a",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: "c",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.code).toBe("PLANO_CONTAS_MOVER_REFERENCIA_CIRCULAR");
		}
		expect(
			planoContasRepository.moverPlanoContasComCodigos,
		).not.toHaveBeenCalled();
	});

	it("deve retornar 400 quando o destino está inativo", async () => {
		const planosComInativo = [...planos, criarPlano("e", "3", null, 1)];
		vi.mocked(
			planoContasRepository.listarTodosPlanoContasPorEmpresa,
		).mockResolvedValue(planosComInativo);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[3] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "d",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: "e",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.code).toBe("PLANO_CONTAS_MOVER_DESTINO_INATIVO");
		}
	});

	it("deve retornar o próprio plano sem alterações quando o destino já é o pai atual", async () => {
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planos[1] as PlanoContas,
		);

		const resultado = await moverPlanoContasService({
			id: "b",
			idusuario: "usuario-123",
			roles: ["proprietario"],
			idplanocontasdestino: "a",
		});

		expect(resultado.success).toBe(true);
		expect(
			planoContasRepository.moverPlanoContasComCodigos,
		).not.toHaveBeenCalled();
	});
});
