import { describe, expect, it } from "vitest";
import { montarPlanoContasPadrao } from "@/util/plano-contas-padrao.js";

describe("montarPlanoContasPadrao", () => {
	const idempresa = "empresa-teste-123";
	const timestampMillis = 1_700_000_000_000;

	it("deve montar 45 contas padrão para a empresa", () => {
		const planos = montarPlanoContasPadrao(idempresa, timestampMillis);

		expect(planos).toHaveLength(45);
	});

	it("deve vincular todas as contas à empresa informada", () => {
		const planos = montarPlanoContasPadrao(idempresa, timestampMillis);

		expect(planos.every((plano) => plano.idempresa === idempresa)).toBe(true);
	});

	it("deve incluir os códigos principais do plano padrão", () => {
		const planos = montarPlanoContasPadrao(idempresa, timestampMillis);
		const codigos = planos.map((plano) => plano.codigo);

		expect(codigos).toContain("1");
		expect(codigos).toContain("2");
		expect(codigos).toContain("3");
		expect(codigos).toContain("4");
		expect(codigos).toContain("5");
	});

	it("deve incluir subcontas de vendas por forma de pagamento", () => {
		const planos = montarPlanoContasPadrao(idempresa, timestampMillis);
		const codigos = planos.map((plano) => plano.codigo);

		expect(codigos).toContain("1 1 1");
		expect(codigos).toContain("1 1 2");
		expect(codigos).toContain("1 1 3");
		expect(codigos).toContain("1 1 4");
		expect(codigos).toContain("1 1 5");
	});

	it("deve manter a hierarquia entre contas pai e filhas", () => {
		const planos = montarPlanoContasPadrao(idempresa, timestampMillis);
		const receitas = planos.find((plano) => plano.codigo === "1");
		const vendas = planos.find((plano) => plano.codigo === "1 1");

		expect(receitas).toBeDefined();
		expect(vendas).toBeDefined();
		expect(vendas?.idplanocontas).toBe(receitas?.id);
	});

	it("deve gerar IDs únicos a cada montagem", () => {
		const primeiroPlano = montarPlanoContasPadrao(idempresa, timestampMillis);
		const segundoPlano = montarPlanoContasPadrao(idempresa, timestampMillis);

		const idsPrimeiroPlano = primeiroPlano.map((plano) => plano.id);
		const idsSegundoPlano = segundoPlano.map((plano) => plano.id);

		expect(idsPrimeiroPlano).not.toEqual(idsSegundoPlano);
	});
});
