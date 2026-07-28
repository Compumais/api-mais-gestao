import { describe, expect, it } from "vitest";
import {
	calcularTotalItem,
	validarCamposExtrasConfigurados,
	validarExtrasNaOrdemServico,
} from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	HEX_COR_REGEX,
	ORDEM_SERVICO_CAMPOS_EXTRA,
	ORDEM_SERVICO_STATUS_PADRAO,
	podeTransicionarStatus,
	TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO,
} from "@/util/ordem-servico-constants.js";

describe("ordem-servico-constants", () => {
	it("deve expor catálogo inicial com 13 status e códigos estáveis", () => {
		expect(ORDEM_SERVICO_STATUS_PADRAO).toHaveLength(13);
		expect(ORDEM_SERVICO_STATUS_PADRAO.map((s) => s.codigo)).toEqual(
			expect.arrayContaining([
				"ABERTA",
				"EM_EXECUCAO",
				"FINALIZADA",
				"CANCELADA",
				"FATURADA",
				"AGENDADA",
				"PAUSADA",
				"MESCLADA",
				"DUPLICADA",
				"SERVICO_NAO_EXECUTADO",
				"ORCAMENTO",
				"FATURADA_PARCIALMENTE",
				"RETIRADA",
			]),
		);
		for (const item of ORDEM_SERVICO_STATUS_PADRAO) {
			expect(item.cor).toMatch(HEX_COR_REGEX);
		}
	});

	it("deve usar origem financeira 4 para OS", () => {
		expect(TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO).toBe(4);
	});

	it("deve permitir faturamento a partir de ABERTA e FINALIZADA", () => {
		expect(podeTransicionarStatus("ABERTA", "FATURADA")).toBe(true);
		expect(podeTransicionarStatus("FINALIZADA", "FATURADA_PARCIALMENTE")).toBe(
			true,
		);
		expect(podeTransicionarStatus("CANCELADA", "ABERTA")).toBe(false);
	});

	it("deve expor 16 campos extras físicos", () => {
		expect(ORDEM_SERVICO_CAMPOS_EXTRA).toHaveLength(16);
		expect(ORDEM_SERVICO_CAMPOS_EXTRA[0]).toBe("extra1");
		expect(ORDEM_SERVICO_CAMPOS_EXTRA[15]).toBe("extra16");
	});
});

describe("ordem-servico-helpers extras", () => {
	it("deve rejeitar campo extra inválido ou duplicado na configuração", () => {
		const invalido = validarCamposExtrasConfigurados([
			{
				campo: "extra99" as never,
				nome: "X",
				ativo: true,
				obrigatorio: false,
			},
		]);
		expect(invalido.valido).toBe(false);

		const duplicado = validarCamposExtrasConfigurados([
			{ campo: "extra1", nome: "A", ativo: true, obrigatorio: false },
			{ campo: "extra1", nome: "B", ativo: true, obrigatorio: false },
		]);
		expect(duplicado.valido).toBe(false);
	});

	it("deve validar extras ativos e obrigatórios na OS", () => {
		const config = [
			{
				campo: "extra1" as const,
				nome: "Número do equipamento",
				ativo: true,
				obrigatorio: true,
			},
			{
				campo: "extra2" as const,
				nome: "Inativo",
				ativo: false,
				obrigatorio: false,
			},
		];

		expect(validarExtrasNaOrdemServico(config, { extra1: "" }).valido).toBe(
			false,
		);
		expect(
			validarExtrasNaOrdemServico(config, { extra1: "ABC", extra2: "x" })
				.valido,
		).toBe(false);
		expect(validarExtrasNaOrdemServico(config, { extra1: "ABC" }).valido).toBe(
			true,
		);
	});

	it("deve calcular total do item", () => {
		expect(calcularTotalItem("2", "10.5")).toBe("21.000");
	});
});
