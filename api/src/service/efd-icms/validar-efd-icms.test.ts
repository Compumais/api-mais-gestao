import { describe, expect, it } from "vitest";
import { NFE_STATUS } from "@/util/nfe-status.js";
import type { ContribuinteEfd, ItemEfd, NotaEfd } from "./tipos-efd-icms.js";
import { validarDadosEfdIcms } from "./validar-efd-icms.js";

function contribuinte(): ContribuinteEfd {
	return {
		cnpj: "52720549000154",
		inscricaoEstadual: "001234567",
		inscricaoMunicipal: null,
		razaosocial: "EMPRESA TESTE",
		nomefantasia: "TESTE",
		uf: "MG",
		codigoMunicipioIbge: "3156908",
		logradouro: "RUA A",
		numero: "10",
		complemento: null,
		bairro: "CENTRO",
		cep: "38190000",
		telefone: "34999999999",
		email: "a@b.com",
		crt: 1,
		indperfil: "A",
		indativ: 1,
		cnae: "1101200",
	};
}

function nota(parcial: Partial<NotaEfd> & { id: string }): NotaEfd {
	return {
		tipoorigem: 1,
		modelo: "55",
		serie: "1",
		numero: "57",
		chave: "31260852720549000154550010000000571234567890",
		emissao: "2026-08-10",
		dataEntradaSaida: "2026-08-10",
		codigoParticipante: "cli",
		valorDocumento: "100.00",
		valorMercadoria: "100.00",
		desconto: "0",
		frete: "0",
		seguro: "0",
		outrasDespesas: "0",
		baseIcms: "0",
		valorIcms: "0",
		baseIcmsSt: "0",
		valorIcmsSt: "0",
		valorIpi: "0",
		valorPis: "0",
		valorCofins: "0",
		indFrete: 9,
		status: NFE_STATUS.AUTORIZADA,
		cancelada: false,
		...parcial,
	};
}

function item(
	parcial: Partial<ItemEfd> & { id: string; idnotafiscal: string },
): ItemEfd {
	return {
		numeroItem: 1,
		codigoProduto: null,
		descricao: "CACHACA",
		unidade: "UN",
		quantidade: "1",
		valorItem: "100.00",
		desconto: "0",
		cfop: "5405",
		cstIcms: null,
		csosn: "500",
		origem: 0,
		baseIcms: "0",
		aliquotaIcms: "0",
		valorIcms: "0",
		baseIcmsSt: "0",
		aliquotaIcmsSt: "0",
		valorIcmsSt: "0",
		cstIpi: null,
		valorIpi: null,
		cstPis: null,
		basePis: null,
		aliquotaPis: null,
		valorPis: null,
		cstCofins: null,
		baseCofins: null,
		aliquotaCofins: null,
		valorCofins: null,
		...parcial,
	};
}

describe("validarDadosEfdIcms COD_ITEM", () => {
	it("cita as NF autorizadas com item sem código", () => {
		const resultado = validarDadosEfdIcms({
			contribuinte: contribuinte(),
			notas: [nota({ id: "n57", numero: "57" })],
			itens: [item({ id: "i1", idnotafiscal: "n57" })],
			inventario: [],
		});

		expect(resultado.erros.some((erro) => erro.includes("nas NF 57"))).toBe(
			true,
		);
	});

	it("não bloqueia C170 vazio de nota cancelada", () => {
		const resultado = validarDadosEfdIcms({
			contribuinte: contribuinte(),
			notas: [
				nota({
					id: "n54",
					numero: "54",
					status: NFE_STATUS.CANCELADA,
					cancelada: true,
				}),
			],
			itens: [item({ id: "i1", idnotafiscal: "n54" })],
			inventario: [],
		});

		expect(resultado.erros.some((erro) => erro.includes("COD_ITEM"))).toBe(
			false,
		);
	});
});
