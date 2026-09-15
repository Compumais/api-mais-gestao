import { describe, expect, it } from "vitest";
import type { LocalEntregaPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { validarLocalEntregaCfopInterestadual } from "./validar-local-entrega-cfop-interestadual.js";

const localFeira: LocalEntregaPayloadNfe = {
	nomeEvento: "Feira Comercial",
	dataInicioEvento: "2026-09-10",
	dataFimEvento: "2026-09-12",
	fundamentoLegal: "Tratamento fiscal validado pelo emitente",
	nome: "Feira Comercial",
	logradouro: "Rua da Exposição",
	numero: "100",
	bairro: "Centro",
	codigoMunicipio: "3550308",
	municipio: "São Paulo",
	uf: "SP",
	cep: "01001000",
};

describe("validarLocalEntregaCfopInterestadual", () => {
	it("exige local de entrega no CFOP especial com destinatário na mesma UF", () => {
		expect(
			validarLocalEntregaCfopInterestadual({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				possuiCfopInterestadual: true,
				possuiCfopInterestadualDestinatarioMesmaUf: true,
			}),
		).toContain("Informe o local de entrega");
	});

	it("rejeita feira na mesma UF do emitente", () => {
		expect(
			validarLocalEntregaCfopInterestadual({
				ufEmitente: "SP",
				ufDestinatario: "SP",
				localEntrega: localFeira,
				possuiCfopInterestadual: true,
				possuiCfopInterestadualDestinatarioMesmaUf: true,
			}),
		).toContain("deve ser diferente");
	});

	it("aceita destinatário próprio e feira em outra UF", () => {
		expect(
			validarLocalEntregaCfopInterestadual({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				localEntrega: localFeira,
				possuiCfopInterestadual: true,
				possuiCfopInterestadualDestinatarioMesmaUf: true,
			}),
		).toBeNull();
	});

	it("não permite usar o fluxo especial sem a flag da natureza", () => {
		expect(
			validarLocalEntregaCfopInterestadual({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				localEntrega: localFeira,
				possuiCfopInterestadual: true,
				possuiCfopInterestadualDestinatarioMesmaUf: false,
			}),
		).toContain("não está habilitada");
	});

	it("preserva operações normais sem a flag especial", () => {
		expect(
			validarLocalEntregaCfopInterestadual({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				possuiCfopInterestadual: false,
				possuiCfopInterestadualDestinatarioMesmaUf: false,
			}),
		).toBeNull();
	});
});
