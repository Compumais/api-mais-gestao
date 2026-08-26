import { describe, expect, it } from "vitest";
import { z } from "zod";
import { camposAliquotaProdutoSchema } from "./campos-impostos-produto.js";

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
