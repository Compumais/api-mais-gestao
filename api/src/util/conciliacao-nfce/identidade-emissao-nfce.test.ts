import { describe, expect, it } from "vitest";
import {
	montarChaveAcessoNfce,
	resolverIdentidadeEmissaoNfce,
} from "./identidade-emissao-nfce.js";

const cUF = 31;
const cnpj = "12345678000195";
const serie = 1;
const numero = 1500;
const cNF = "12345678";

const chaveOutubro = montarChaveAcessoNfce({
	cUF,
	anoMes: "2610",
	cnpj,
	serie,
	numero,
	tpEmis: 1,
	cNF,
});

describe("resolverIdentidadeEmissaoNfce", () => {
	it("emissão normal atualiza dhEmi e mantém a chave no mesmo mês", () => {
		const identidade = resolverIdentidadeEmissaoNfce({
			dhEmi: "2026-10-01T11:20:00-03:00",
			cUF,
			cnpj,
			serie,
			numero,
			chaveAtual: chaveOutubro,
			conciliacao: {
				cNF,
				tpEmis: 1,
				dhEmi: "2026-10-01T08:00:00-03:00",
			},
		});

		expect(identidade.dhEmi).toBe("2026-10-01T11:20:00-03:00");
		expect(identidade.cNF).toBe(cNF);
		expect(identidade.tpEmis).toBe(1);
		expect(identidade.anoMes).toBe("2610");
		expect(identidade.chavePrevista).toBe(chaveOutubro);
	});

	it("contingência offline preserva o dhEmi original", () => {
		const chaveContingencia = montarChaveAcessoNfce({
			cUF,
			anoMes: "2610",
			cnpj,
			serie,
			numero,
			tpEmis: 9,
			cNF,
		});
		const identidade = resolverIdentidadeEmissaoNfce({
			dhEmi: "2026-10-01T11:20:00-03:00",
			cUF,
			cnpj,
			serie,
			numero,
			chaveAtual: chaveContingencia,
			conciliacao: {
				cNF,
				tpEmis: 9,
				dhEmi: "2026-10-01T08:00:00-03:00",
			},
		});

		expect(identidade.dhEmi).toBe("2026-10-01T08:00:00-03:00");
		expect(identidade.tpEmis).toBe(9);
		expect(identidade.anoMes).toBe("2610");
		expect(identidade.chavePrevista).toBe(chaveContingencia);
	});

	it("emissão normal em outro mês acompanha o AAMM do dhEmi novo", () => {
		const identidade = resolverIdentidadeEmissaoNfce({
			dhEmi: "2026-11-01T09:00:00-03:00",
			cUF,
			cnpj,
			serie,
			numero,
			chaveAtual: chaveOutubro,
			conciliacao: {
				cNF,
				tpEmis: 1,
				dhEmi: "2026-10-31T23:50:00-03:00",
			},
		});

		expect(identidade.dhEmi).toBe("2026-11-01T09:00:00-03:00");
		expect(identidade.anoMes).toBe("2611");
		expect(identidade.cNF).toBe(cNF);
		expect(identidade.chavePrevista).toBe(
			montarChaveAcessoNfce({
				cUF,
				anoMes: "2611",
				cnpj,
				serie,
				numero,
				tpEmis: 1,
				cNF,
			}),
		);
	});
});
