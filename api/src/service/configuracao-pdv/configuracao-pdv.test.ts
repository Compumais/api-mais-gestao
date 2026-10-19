import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configuracaoRepository from "@/repositories/configuracao-pdv-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { buscarConfiguracaoPdvService } from "./buscar-configuracao-pdv.js";
import { salvarConfiguracaoPdvService } from "./salvar-configuracao-pdv.js";

vi.mock("@/repositories/configuracao-pdv-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");

const dadosPadrao = {
	modeloAtendimento: "mesa" as const,
	etiqueta_balanca_habilitada: "0" as const,
	etiqueta_balanca_prefixo: "2",
	etiqueta_balanca_digitos_codigo: "4" as const,
	etiqueta_balanca_conteudo: "preco" as const,
	etiqueta_balanca_centavos: "1" as const,
	etiqueta_balanca_indicador_uso: "0" as const,
	venda_sem_estoque: "0" as const,
};

describe("configuracao pdv", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("recusa quem não pertence à empresa", async () => {
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			false,
		);

		const resultado = await buscarConfiguracaoPdvService({
			idusuario: "usuario",
			idempresa: "empresa",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
	});

	it("devolve o padrão quando a empresa ainda não configurou", async () => {
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(
			configuracaoRepository.buscarConfiguracaoPdvPorEmpresa,
		).mockResolvedValue(undefined);

		const resultado = await buscarConfiguracaoPdvService({
			idusuario: "usuario",
			idempresa: "empresa",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(dadosPadrao);
		}
	});

	it("grava modo comanda e etiqueta de peso", async () => {
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(
			configuracaoRepository.buscarConfiguracaoPdvPorEmpresa,
		).mockResolvedValue(undefined);
		vi.mocked(configuracaoRepository.salvarConfiguracaoPdv).mockImplementation(
			async (dados) => dados,
		);

		const resultado = await salvarConfiguracaoPdvService({
			idusuario: "usuario",
			idempresa: "empresa",
			dados: {
				...dadosPadrao,
				modeloAtendimento: "comanda",
				etiqueta_balanca_habilitada: "1",
				etiqueta_balanca_conteudo: "peso",
				etiqueta_balanca_digitos_codigo: "5",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.modeloAtendimento).toBe("comanda");
			expect(resultado.body?.etiqueta_balanca_habilitada).toBe("1");
			expect(resultado.body?.etiqueta_balanca_conteudo).toBe("peso");
			expect(resultado.body?.etiqueta_balanca_digitos_codigo).toBe("5");
			expect(resultado.body?.venda_sem_estoque).toBe("0");
		}
	});

	it("liga venda sem estoque sem apagar o modo de atendimento", async () => {
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(
			configuracaoRepository.buscarConfiguracaoPdvPorEmpresa,
		).mockResolvedValue({
			id: "cfg-1",
			idempresa: "empresa",
			modeloatendimento: "comanda",
			etiquetabalancahabilitada: 1,
			etiquetabalancaprefixo: "2",
			etiquetabalancadigitoscodigo: 5,
			etiquetabalancaconteudo: "peso",
			etiquetabalancacentavos: 1,
			etiquetabalancaindicadoruso: 0,
			vendasemestoque: 0,
			atualizadoem: "2026-01-01T00:00:00.000Z",
		});
		vi.mocked(configuracaoRepository.salvarConfiguracaoPdv).mockImplementation(
			async (dados) => dados,
		);

		const resultado = await salvarConfiguracaoPdvService({
			idusuario: "usuario",
			idempresa: "empresa",
			dados: { venda_sem_estoque: "1" },
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.venda_sem_estoque).toBe("1");
			expect(resultado.body?.modeloAtendimento).toBe("comanda");
			expect(resultado.body?.etiqueta_balanca_habilitada).toBe("1");
			expect(resultado.body?.etiqueta_balanca_conteudo).toBe("peso");
		}
	});
});
