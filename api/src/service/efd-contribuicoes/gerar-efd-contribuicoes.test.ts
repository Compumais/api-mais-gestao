import { describe, expect, it } from "vitest";
import type { ContribuinteEfd, ItemEfd } from "@/service/efd-icms/tipos-efd-icms.js";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import {
	crtPermiteEfdContribuicoes,
	montarRegistro0000Contribuicoes,
	montarRegistroC170Contribuicoes,
	montarRegistroM210Contribuicoes,
	montarRegistroM610Contribuicoes,
} from "./gerar-efd-contribuicoes.js";

describe("EFD-Contribuições", () => {
	it("bloqueia CRT Simples e MEI", () => {
		expect(crtPermiteEfdContribuicoes(1)).toBe(false);
		expect(crtPermiteEfdContribuicoes(2)).toBe(false);
		expect(crtPermiteEfdContribuicoes(4)).toBe(false);
		expect(crtPermiteEfdContribuicoes(3)).toBe(true);
	});

	it("exige mês civil", () => {
		expect(validarPeriodoEfd("2026-01-01", "2026-01-31")).toBeNull();
		expect(validarPeriodoEfd("2026-01-01", "2026-02-01")).toContain(
			"mês civil",
		);
	});

	it("monta registro 0000 com 14 campos e sem Inscrição Estadual", () => {
		const contribuinte: ContribuinteEfd = {
			cnpj: "10579611000190",
			inscricaoEstadual: "001234567",
			inscricaoMunicipal: null,
			razaosocial: "EMPRESA TESTE LTDA",
			nomefantasia: "TESTE",
			uf: "MG",
			codigoMunicipioIbge: "3106200",
			logradouro: "RUA A",
			numero: "10",
			complemento: null,
			bairro: "CENTRO",
			cep: "30130100",
			telefone: "31999999999",
			email: "a@b.com",
			crt: 3,
			indperfil: "A",
			indativ: 1,
			cnae: "4711302",
		};

		const linha = montarRegistro0000Contribuicoes({
			contribuinte,
			dataInicio: "2026-01-01",
			dataFim: "2026-01-31",
			codVer: "006",
			finalidade: "0",
		});

		expect(linha).toBe(
			"|0000|006|0|||01012026|31012026|EMPRESA TESTE LTDA|10579611000190|MG|3106200||00|1|",
		);
		const campos = linha.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
		expect(campos).toHaveLength(14);
		expect(campos[10]).toBe("3106200"); // COD_MUN
		expect(linha).not.toContain("001234567"); // Não deve conter IE no 0000
	});

	it("monta registro C170 da EFD-Contribuições com exatamente 37 campos", () => {
		const item: ItemEfd = {
			id: "1",
			idnotafiscal: "n1",
			numeroItem: 1,
			codigoProduto: "PROD1",
			descricao: "PRODUTO 1",
			unidade: "UN",
			quantidade: "1",
			valorItem: "100.00",
			desconto: "0",
			cfop: "5102",
			cstIcms: "00",
			csosn: null,
			origem: 0,
			baseIcms: "100.00",
			aliquotaIcms: "18.00",
			valorIcms: "18.00",
			baseIcmsSt: "0",
			aliquotaIcmsSt: "0",
			valorIcmsSt: "0",
			cstIpi: null,
			valorIpi: "0",
			cstPis: "01",
			basePis: "100.00",
			aliquotaPis: "1.65",
			valorPis: "1.65",
			cstCofins: "01",
			baseCofins: "100.00",
			aliquotaCofins: "7.60",
			valorCofins: "7.60",
		};

		const linha = montarRegistroC170Contribuicoes(item, 1);
		const campos = linha.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
		expect(campos).toHaveLength(37);
		expect(campos[0]).toBe("C170");
		expect(campos[24]).toBe("01"); // CST_PIS
		expect(campos[29]).toBe("1,65"); // VL_PIS
		expect(campos[30]).toBe("01"); // CST_COFINS
		expect(campos[35]).toBe("7,60"); // VL_COFINS
	});

	it("monta registros M210 e M610 com 16 campos cada", () => {
		const linhaM210 = montarRegistroM210Contribuicoes({
			codCont: "51",
			baseCalculo: 100,
			aliquota: 0.65,
			valorApurado: 0.65,
			valorRecolher: 0.65,
		});
		const camposM210 = linhaM210.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
		expect(camposM210).toHaveLength(16);
		expect(camposM210[0]).toBe("M210");
		expect(camposM210[1]).toBe("51");
		expect(camposM210[10]).toBe("0,65");

		const linhaM610 = montarRegistroM610Contribuicoes({
			codCont: "51",
			baseCalculo: 100,
			aliquota: 3.0,
			valorApurado: 3.0,
			valorRecolher: 3.0,
		});
		const camposM610 = linhaM610.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
		expect(camposM610).toHaveLength(16);
		expect(camposM610[0]).toBe("M610");
		expect(camposM610[1]).toBe("51");
		expect(camposM610[10]).toBe("3,00");
	});
});
