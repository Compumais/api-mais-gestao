import { describe, expect, it } from "vitest";
import {
	CABECALHO_TEMPLATE_ENTIDADES,
	COLUNAS_EXPORTACAO_ENTIDADES,
	validarArquivoImportacaoEntidades,
} from "./entidades-importacao.js";

function csv(linhas: string[][]): string {
	return `\uFEFF${linhas.map((linha) => linha.join(";")).join("\n")}`;
}

describe("validarArquivoImportacaoEntidades", () => {
	it("aceita o mesmo cabeçalho do export e ignora Data cadastro", async () => {
		const resultado = await validarArquivoImportacaoEntidades(
			"csv",
			csv([
				[...COLUNAS_EXPORTACAO_ENTIDADES],
				[
					"Maria Souza",
					"Maria Souza",
					"390.533.447-05",
					"Rua A",
					"Física",
					"9 — Não Contribuinte",
					"",
					"",
					"maria@example.com",
					"34988887777",
					"10",
					"",
					"Centro",
					"38180-000",
					"",
					"15/05/1990",
					"Brasil",
					"01/01/2026",
				],
			]),
		);

		expect(resultado.errosGerais).toEqual([]);
		expect(resultado.totalEntidades).toBe(1);
		expect(resultado.totalErros).toBe(0);
		expect(resultado.entidades[0]).toMatchObject({
			nome: "Maria Souza",
			documento: "39053344705",
			tipopessoa: 0,
			indiedest: 9,
			nascimento: "1990-05-15",
			email: "maria@example.com",
		});
	});

	it("exige Nome e CNPJ/CPF e aponta documento repetido", async () => {
		const resultado = await validarArquivoImportacaoEntidades(
			"csv",
			csv([
				[...CABECALHO_TEMPLATE_ENTIDADES],
				[
					"",
					"Sem nome",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				],
				[
					"Ana",
					"",
					"39053344705",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				],
				[
					"Bia",
					"",
					"39053344705",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				],
			]),
		);

		expect(resultado.entidades[0]?.erros).toContain("Nome é obrigatório");
		expect(resultado.entidades[0]?.erros).toContain("CNPJ/CPF é obrigatório");
		expect(resultado.entidades[2]?.erros).toContain(
			"CNPJ/CPF repetido na linha 3",
		);
	});
});
