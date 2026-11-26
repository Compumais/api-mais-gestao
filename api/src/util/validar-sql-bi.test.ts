import { describe, expect, it } from "vitest";
import { BI_CATALOGO_GRAFICOS } from "../constants/bi-catalogo.js";
import {
	ErroValidacaoSqlBi,
	validarEPrepararSqlBi,
} from "./validar-sql-bi.js";

describe("validarEPrepararSqlBi", () => {
	it("aceita SELECT simples com views do schema relatorios e parâmetros nomeados", () => {
		const res = validarEPrepararSqlBi(
			`SELECT dia, total FROM relatorios.vw_vendas_pdv WHERE data_venda::date BETWEEN :data_inicio::date AND :data_fim::date;`,
			{ data_inicio: "2026-01-01", data_fim: "2026-01-31" },
		);

		expect(res.parametrosDetectados).toEqual(["data_inicio", "data_fim"]);
		expect(res.valores).toEqual(["2026-01-01", "2026-01-31"]);
		expect(res.sqlParametrizado).toContain("$1::date AND $2::date");
	});

	it("reutiliza índice de parâmetro quando repetido e ignora :dentro de string", () => {
		const res = validarEPrepararSqlBi(
			`SELECT ':nao_param' AS txt, valor FROM vw_financeiro WHERE emissao >= :data_inicio AND vencimento >= :data_inicio`,
			{ data_inicio: "2026-02-01" },
		);

		expect(res.parametrosDetectados).toEqual(["data_inicio"]);
		expect(res.valores).toEqual(["2026-02-01"]);
		expect(res.sqlParametrizado).toContain("':nao_param'");
		expect(res.sqlParametrizado).toContain("emissao >= $1 AND vencimento >= $1");
	});

	it("valida todas as consultas prontas do BI_CATALOGO_GRAFICOS", () => {
		for (const item of BI_CATALOGO_GRAFICOS) {
			const res = validarEPrepararSqlBi(item.sql, {
				data_inicio: "2026-01-01",
				data_fim: "2026-01-31",
			});
			expect(res.sqlParametrizado.length).toBeGreaterThan(10);
		}
	});

	it("rejeita comandos DML/DDL e múltiplos statements", () => {
		expect(() =>
			validarEPrepararSqlBi("DELETE FROM vw_produtos WHERE id = '1'"),
		).toThrow(ErroValidacaoSqlBi);

		expect(() =>
			validarEPrepararSqlBi("DROP TABLE empresas"),
		).toThrow(ErroValidacaoSqlBi);

		expect(() =>
			validarEPrepararSqlBi("SELECT 1; SELECT 2"),
		).toThrow(ErroValidacaoSqlBi);

		expect(() =>
			validarEPrepararSqlBi(
				"WITH x AS (DELETE FROM vw_produtos RETURNING id) SELECT * FROM x",
			),
		).toThrow(ErroValidacaoSqlBi);
	});

	it("rejeita acesso a schemas fora de relatorios e funções bloqueadas", () => {
		expect(() =>
			validarEPrepararSqlBi("SELECT * FROM public.usuarios"),
		).toThrow(/schema "public"/i);

		expect(() =>
			validarEPrepararSqlBi("SELECT * FROM information_schema.tables"),
		).toThrow(/schema "information_schema"/i);

		expect(() =>
			validarEPrepararSqlBi("SELECT * FROM pg_catalog.pg_tables"),
		).toThrow(/schema "pg_catalog"/i);

		expect(() =>
			validarEPrepararSqlBi("SELECT pg_sleep(10)"),
		).toThrow(/pg_sleep/i);

		expect(() =>
			validarEPrepararSqlBi("SELECT current_setting('app.empresa_id')"),
		).toThrow(/current_setting/i);
	});
});
