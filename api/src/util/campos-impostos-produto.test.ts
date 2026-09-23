import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	camposAliquotaProdutoSchema,
	camposImpostosProdutoSchema,
	refinirCamposIbsCbsProduto,
} from "./campos-impostos-produto.js";

describe("alíquotas IBS/CBS do produto", () => {
	const schema = z.object(camposAliquotaProdutoSchema);

	it("grava alíquotas com até 4 casas decimais", () => {
		const resultado = schema.parse({
			aliquotaiibs: "0,1000",
			aliquotacbs: "0.9",
		});

		expect(resultado.aliquotaiibs).toBe("0.1000");
		expect(resultado.aliquotacbs).toBe("0.9000");
	});

	it("aceita vazio para limpar o cadastro", () => {
		const resultado = schema.parse({
			aliquotaiibs: "",
			aliquotacbs: null,
		});

		expect(resultado.aliquotaiibs).toBeNull();
		expect(resultado.aliquotacbs).toBeNull();
	});
});

describe("CST e classificação IBS/CBS do produto", () => {
	const schema = z
		.object(camposImpostosProdutoSchema)
		.superRefine((dados, ctx) => refinirCamposIbsCbsProduto(dados, ctx));

	it("aceita CST e classificação compatíveis", () => {
		const resultado = schema.parse({
			cstibs: "000",
			classtributariaibs: "000001",
		});
		expect(resultado.cstibs).toBe("000");
		expect(resultado.classtributariaibs).toBe("000001");
	});

	it("rejeita classificação de outro CST", () => {
		expect(() =>
			schema.parse({
				cstibs: "000",
				classtributariaibs: "200001",
			}),
		).toThrow();
	});

	it("exige classificação quando CST é informado", () => {
		expect(() =>
			schema.parse({
				cstibs: "000",
				classtributariaibs: null,
			}),
		).toThrow();
	});
});
