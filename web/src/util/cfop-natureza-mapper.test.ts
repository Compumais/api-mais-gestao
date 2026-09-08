import { describe, expect, it } from "vitest";
import { cfopFormSchema } from "@/schemas/cfop.schema";
import {
	mapearNaturezaFormParaApi,
	mapearTipoConsignacaoParaCampos,
	parseNaoConsiderarValorItem,
	resolverTipoConsignacao,
	serializarNaoConsiderarValorItem,
	valoresIniciaisNaturezaForm,
} from "@/util/cfop-natureza-mapper";

describe("cfop-natureza-mapper", () => {
	it("converte ativo ↔ inativa e consignação", () => {
		const iniciais = valoresIniciaisNaturezaForm({
			codigo: "5914",
			descricao: "Remessa",
			inativa: 0,
			consignacao: 1,
			consignacaoentrada: 0,
			naoconsiderarvlnotafiscalitem: "1",
			consideravenda: 1,
		});

		expect(iniciais.ativo).toBe(true);
		expect(iniciais.tipoConsignacao).toBe("saida");
		expect(iniciais.naoconsiderarvlnotafiscalitem).toBe(true);
		expect(iniciais.consideravenda).toBe(true);

		const payload = mapearNaturezaFormParaApi(iniciais);
		expect(payload.inativa).toBe(0);
		expect(payload.consignacao).toBe(1);
		expect(payload.consignacaoentrada).toBe(0);
		expect(payload.naoconsiderarvlnotafiscalitem).toBe("1");
	});

	it("mapeia consignação de entrada", () => {
		expect(resolverTipoConsignacao({ consignacaoentrada: 1 })).toBe("entrada");
		expect(mapearTipoConsignacaoParaCampos("entrada")).toEqual({
			consignacao: 0,
			consignacaoentrada: 1,
		});
	});

	it("serializa flag textual legada", () => {
		expect(serializarNaoConsiderarValorItem(true)).toBe("1");
		expect(parseNaoConsiderarValorItem("0")).toBe(false);
	});

	it("valida schema do formulário com defaults", () => {
		const parsed = cfopFormSchema.parse({
			codigo: "5102",
			descricao: "Venda de mercadoria",
			ativo: true,
			consideravenda: false,
			considerarservico: false,
			digitarimpostositemnotasaida: false,
			calcularimpostoaproximado: false,
			possuiincentivosfiscais: false,
			consideracustomedio: false,
			informartotaismanualmente: false,
			permitenotasemvalor: false,
			consumidorfinal: false,
			permitirbaixarlotevencido: false,
			naobaixarestoque: false,
			digitartotalitemmanualmente: false,
			considerainscricaoestadualsub: false,
			exigirdocumentoreferenciado: false,
			registrarproducaovenda: false,
			considerarproduto: false,
			naoconsiderapiscofinsproduto: false,
			naoconsiderarvlnotafiscalitem: false,
			utilizartodasoperacoes: false,
			tipoConsignacao: "nenhuma",
		});

		expect(parsed.ativo).toBe(true);
		expect(parsed.tipoConsignacao).toBe("nenhuma");
		expect(parsed.consideravenda).toBe(false);
	});
});
