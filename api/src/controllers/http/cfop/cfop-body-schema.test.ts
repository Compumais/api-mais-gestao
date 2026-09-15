import { describe, expect, it } from "vitest";
import {
	atualizarCfopBodySchema,
	criarCfopBodySchema,
	serializarNaoConsiderarValorItem,
} from "@/controllers/http/cfop/cfop-body-schema.js";

describe("cfop-body-schema", () => {
	it("aceita payload mínimo de criação", () => {
		const resultado = criarCfopBodySchema.parse({
			idempresa: "11111111-1111-4111-8111-111111111111",
			codigo: "5102",
			descricao: "Venda",
		});

		expect(resultado.codigo).toBe("5102");
		expect(resultado.descricao).toBe("Venda");
	});

	it("normaliza flags e enums da aba Geral", () => {
		const resultado = atualizarCfopBodySchema.parse({
			inativa: "0",
			consideravenda: 1,
			presencaconsumidor: "2",
			finalidadeemissaonfe: 4,
			tipovalorpreco: 1,
			integracao: 2,
			naoconsiderarvlnotafiscalitem: true,
			idplanocontas: "22222222-2222-4222-8222-222222222222",
			idtipodocumentofinanceiro: null,
		});

		expect(resultado.inativa).toBe(0);
		expect(resultado.consideravenda).toBe(1);
		expect(resultado.presencaconsumidor).toBe(2);
		expect(resultado.finalidadeemissaonfe).toBe(4);
		expect(resultado.tipovalorpreco).toBe(1);
		expect(resultado.integracao).toBe(2);
		expect(resultado.naoconsiderarvlnotafiscalitem).toBe("1");
		expect(resultado.idtipodocumentofinanceiro).toBeNull();
	});

	it("rejeita finalidade inválida", () => {
		expect(() =>
			atualizarCfopBodySchema.parse({
				finalidadeemissaonfe: 99,
			}),
		).toThrow();
	});

	it("serializa flag textual legada", () => {
		expect(serializarNaoConsiderarValorItem(true)).toBe("1");
		expect(serializarNaoConsiderarValorItem(false)).toBe("0");
		expect(serializarNaoConsiderarValorItem(1)).toBe("1");
		expect(serializarNaoConsiderarValorItem(null)).toBeNull();
	});
});
