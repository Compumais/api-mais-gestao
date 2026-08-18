import { describe, expect, it } from "vitest";
import { completarListagemNfce } from "@/util/completar-listagem-nfce.js";

const CHAVE_NFCE = "35260812345678000190650010000001011000000010";

const cabecalhoVazio = {
	numeronotafiscal: null,
	serie: null,
	chavenfe: CHAVE_NFCE,
	valortotalnota: "0.00",
	emissao: null,
	datahoraemissao: null,
	datainclusao: null,
};

describe("completarListagemNfce", () => {
	it("preenche série e número a partir da chave de 44 dígitos", () => {
		const resultado = completarListagemNfce(cabecalhoVazio);

		expect(resultado.serie).toBe("1");
		expect(resultado.numeronotafiscal).toBe("101");
		expect(resultado.chavenfe).toBe(CHAVE_NFCE);
	});

	it("usa valor e data da venda quando a nota está zerada", () => {
		const resultado = completarListagemNfce(cabecalhoVazio, {
			valortotal: "18.00",
			datacriacao: "2026-08-18T13:32:00-03:00",
		});

		expect(resultado.valortotalnota).toBe("18.00");
		expect(resultado.datahoraemissao).toBe("2026-08-18T13:32:00-03:00");
		expect(resultado.emissao).toBe("2026-08-18");
	});

	it("deriva a data do AAMM da chave quando não há outra referência", () => {
		const resultado = completarListagemNfce(cabecalhoVazio);

		expect(resultado.datahoraemissao).toBe("2026-08-01T00:00:00-03:00");
		expect(resultado.emissao).toBe("2026-08-01");
	});

	it("não altera cabeçalho já preenchido", () => {
		const nota = {
			numeronotafiscal: "101",
			serie: "10",
			chavenfe: CHAVE_NFCE,
			valortotalnota: "18.00",
			emissao: "2026-08-18",
			datahoraemissao: "2026-08-18T13:32:00-03:00",
			datainclusao: "2026-08-18T13:32:00-03:00",
		};

		expect(completarListagemNfce(nota, { valortotal: "99.00" })).toEqual(nota);
	});
});
