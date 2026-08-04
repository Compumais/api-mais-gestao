import { describe, expect, it } from "vitest";
import { ordemServicoFormSchema } from "./ordem-servico.schema";

describe("ordemServicoFormSchema", () => {
	it("aceita strings vazias em campos UUID opcionais convertendo para null", () => {
		const resultado = ordemServicoFormSchema.safeParse({
			idcliente: "",
			idobjeto: "",
			idarea: "",
			idtipoproblema: "",
			idatendente: "",
			idultimotecnico: "",
			idcondicaopagamento: "",
			idtipodocumentofinanceiro: "",
			problemadescrito: "Teste",
			agendamento: "",
			orcamento: 0,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.idcliente).toBeNull();
			expect(resultado.data.idatendente).toBeNull();
			expect(resultado.data.idultimotecnico).toBeNull();
			expect(resultado.data.agendamento).toBeNull();
		}
	});

	it("aceita IDs de usuário que não são UUID", () => {
		const resultado = ordemServicoFormSchema.safeParse({
			idatendente: "user_abc123XYZ",
			idultimotecnico: "cesar-borges-id",
			orcamento: 0,
		});
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.idatendente).toBe("user_abc123XYZ");
			expect(resultado.data.idultimotecnico).toBe("cesar-borges-id");
		}
	});

	it("rejeita UUID inválido em campos de entidade", () => {
		const resultado = ordemServicoFormSchema.safeParse({
			idcliente: "nao-e-uuid",
			orcamento: 0,
		});
		expect(resultado.success).toBe(false);
	});
});
