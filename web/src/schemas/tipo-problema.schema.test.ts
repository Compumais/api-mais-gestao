import { describe, expect, it } from "vitest";
import { tipoProblemaFormSchema } from "./tipo-problema.schema";

describe("tipoProblemaFormSchema", () => {
	it("aceita dados válidos", () => {
		const resultado = tipoProblemaFormSchema.safeParse({
			codigo: "TP01",
			descricao: "Manutenção",
			inativo: false,
		});
		expect(resultado.success).toBe(true);
	});

	it("exige descrição", () => {
		const resultado = tipoProblemaFormSchema.safeParse({
			codigo: "TP01",
			descricao: "",
			inativo: false,
		});
		expect(resultado.success).toBe(false);
	});

	it("limita código a 6 caracteres", () => {
		const resultado = tipoProblemaFormSchema.safeParse({
			codigo: "1234567",
			descricao: "Problema",
			inativo: true,
		});
		expect(resultado.success).toBe(false);
	});
});
