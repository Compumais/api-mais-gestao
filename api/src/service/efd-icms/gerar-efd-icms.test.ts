import { describe, expect, it } from "vitest";
import { montarLinhaPipe } from "@/util/efd/formatador-pipe.js";
import { codigoVersaoEfdIcms } from "@/util/efd/vigencia.js";
import { montarRegistro0000 } from "./registros/bloco-0.js";
import {
	agruparItensC190,
	conferirC190IgualC170,
	montarRegistroC100,
} from "./registros/bloco-c.js";
import type { ContribuinteEfd, ItemEfd } from "./tipos-efd-icms.js";

describe("formatador EFD", () => {
	it("monta linha pipe com campos vazios", () => {
		expect(montarLinhaPipe(["C100", "0", "", "55"])).toBe("|C100|0||55|");
	});

	it("usa leiaute 020 a partir de 2026", () => {
		expect(codigoVersaoEfdIcms("2026-01-01")).toBe("020");
		expect(codigoVersaoEfdIcms("2025-06-01")).toBe("019");
	});
});

describe("registro 0000", () => {
	it("gera cabeçalho com COD_VER e perfil", () => {
		const contribuinte: ContribuinteEfd = {
			cnpj: "10579611000190",
			inscricaoEstadual: "001234567",
			inscricaoMunicipal: null,
			razaosocial: "EMPRESA TESTE",
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

		const linha = montarRegistro0000({
			contribuinte,
			dataInicio: "2026-01-01",
			dataFim: "2026-01-31",
			codVer: "020",
			finalidade: "0",
		});

		expect(linha.startsWith("|0000|020|0|01012026|31012026|")).toBe(true);
		expect(linha).toContain("|10579611000190|");
		expect(linha).toContain("|A|1|");
	});
});

describe("C190 x C170", () => {
	it("soma itens na tolerancia", () => {
		const itens: ItemEfd[] = [
			{
				id: "1",
				idnotafiscal: "n1",
				numeroItem: 1,
				codigoProduto: "10",
				descricao: "P",
				unidade: "UN",
				quantidade: "1",
				valorItem: "100.00",
				desconto: "0",
				cfop: "5102",
				cstIcms: "00",
				csosn: null,
				origem: 0,
				baseIcms: "100.00",
				aliquotaIcms: "18",
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
			},
		];
		const grupos = agruparItensC190(itens);
		expect(grupos).toHaveLength(1);
		expect(grupos[0]?.valorIcms).toBe(18);
		expect(conferirC190IgualC170(itens, grupos)).toEqual([]);
	});

	it("detecta C190 sem ST quando o C170 tem ST", () => {
		const itens: ItemEfd[] = [
			{
				id: "1",
				idnotafiscal: "n1",
				numeroItem: 1,
				codigoProduto: "10",
				descricao: "P",
				unidade: "UN",
				quantidade: "1",
				valorItem: "100.00",
				desconto: "0",
				cfop: "5401",
				cstIcms: "10",
				csosn: null,
				origem: 0,
				baseIcms: "0",
				aliquotaIcms: "0",
				valorIcms: "0",
				baseIcmsSt: "200.00",
				aliquotaIcmsSt: "18",
				valorIcmsSt: "36.00",
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
			},
		];
		const grupos = agruparItensC190(itens);
		expect(grupos[0]?.valorIcmsSt).toBe(36);
		expect(conferirC190IgualC170(itens, grupos)).toEqual([]);
	});
});

describe("C100 situação", () => {
	it("mantém chave de 44 dígitos e COD_SIT de cancelada", () => {
		const chave = "31260110579611000190550010000000011234567890";
		const linha = montarRegistroC100(
			{
				id: "n1",
				tipoorigem: 1,
				modelo: "55",
				serie: "1",
				numero: "1",
				chave,
				emissao: "2026-01-10",
				dataEntradaSaida: "2026-01-10",
				codigoParticipante: "CLI1",
				valorDocumento: "100.00",
				valorMercadoria: "100.00",
				desconto: "0",
				frete: "0",
				seguro: "0",
				outrasDespesas: "0",
				baseIcms: "100.00",
				valorIcms: "18.00",
				baseIcmsSt: "0",
				valorIcmsSt: "0",
				valorIpi: "0",
				valorPis: "1.65",
				valorCofins: "7.60",
				indFrete: 9,
				status: 101,
				cancelada: true,
			},
			false,
		);
		expect(linha).toContain("|55|02|");
		expect(linha).toContain(`|${chave}|`);
		expect(linha).not.toContain("|10579611000190|3126");
	});
});
