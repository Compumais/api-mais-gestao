import { describe, expect, it } from "vitest";
import { buildServicoPayload } from "./servicos.mapper";
import { SERVICO_FORM_DEFAULTS, servicoFormSchema } from "./servicos.schema";

describe("servicoFormSchema", () => {
	it("aceita defaults fiscais seguros", () => {
		const resultado = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Consultoria",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "100.00",
		});
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.ativo).toBe(true);
			expect(resultado.data.itemrapido).toBe(false);
			expect(resultado.data.podeserbrinde).toBe(false);
			expect(resultado.data.iat).toBe("T");
			expect(resultado.data.decimaispreco).toBe(2);
			expect(resultado.data.exigibilidadeiss).toBe("1");
			expect(resultado.data.incentivofiscal).toBe(false);
		}
	});

	it("valida cTribNac com 6 dígitos", () => {
		const invalido = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Serviço",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "10.00",
			codigotributacaonacional: "123",
		});
		expect(invalido.success).toBe(false);

		const valido = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Serviço",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "10.00",
			codigotributacaonacional: "010101",
		});
		expect(valido.success).toBe(true);
	});

	it("valida NBS com 9 dígitos", () => {
		const invalido = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Serviço",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "10.00",
			codigonbs: "123",
		});
		expect(invalido.success).toBe(false);

		const valido = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Serviço",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "10.00",
			codigonbs: "115021000",
		});
		expect(valido.success).toBe(true);
	});

	it("rejeita percentuais negativos", () => {
		const resultado = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "Serviço",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "10.00",
			comissao: "-1",
		});
		expect(resultado.success).toBe(false);
	});

	it("exige nome e unidade", () => {
		const resultado = servicoFormSchema.safeParse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 1,
			nome: "",
			idunidademedida: "",
			preco: "10.00",
		});
		expect(resultado.success).toBe(false);
	});

	it("monta payload de serviço com tipo S e tipoproduto 09", () => {
		const parseado = servicoFormSchema.parse({
			...SERVICO_FORM_DEFAULTS,
			codigo: 10,
			nome: "Manutenção",
			idunidademedida: "11111111-1111-1111-1111-111111111111",
			preco: "150.00",
			codigotributacaonacional: "010101",
			codigonbs: "115021000",
			ativo: true,
			itemrapido: true,
		});

		const payload = buildServicoPayload(
			parseado,
			"22222222-2222-2222-2222-222222222222",
		);

		expect(payload.tipo).toBe("S");
		expect(payload.tipoproduto).toBe("09");
		expect(payload.inativo).toBe(0);
		expect(payload.itemrapido).toBe(1);
		expect(payload.ncm).toBeNull();
		expect(payload.codigotributacaonacional).toBe("010101");
		expect(payload.codigonbs).toBe("115021000");
	});
});
