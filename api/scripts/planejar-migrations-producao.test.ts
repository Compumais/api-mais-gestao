import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type MigrationPlanejavel,
	PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO,
	planejarMigrationsProducao,
} from "./planejar-migrations-producao.js";

const migrations: MigrationPlanejavel[] = [
	{ tag: "0000_inicial", hash: "hash-0000" },
	{ tag: "0028_controle_acesso", hash: "hash-0028" },
	{ tag: "0101_nfeserie_ambiente", hash: "hash-0101" },
	{
		tag: PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO,
		hash: "hash-0102",
	},
	{ tag: "0103_futura", hash: "hash-0103" },
	{ tag: "0104_futura", hash: "hash-0104" },
];

describe("planejarMigrationsProducao", () => {
	it("seleciona 0102 como primeira pendente no journal real", () => {
		const journal = JSON.parse(
			readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
		) as { entries: Array<{ tag: string }> };
		const migrationsDoJournal = journal.entries.map(({ tag }) => ({
			tag,
			hash: `hash-${tag}`,
		}));

		const plano = planejarMigrationsProducao(
			migrationsDoJournal,
			new Set(),
			true,
		);

		expect(plano.baseline.at(-1)?.tag).toBe("0101_nfeserie_ambiente");
		expect(plano.pendentes[0]?.tag).toBe(PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO);
	});

	it("faz baseline do histórico do db:push e aplica migrations corretivas", () => {
		const plano = planejarMigrationsProducao(migrations, new Set(), true);

		expect(plano.baseline.map(({ tag }) => tag)).toEqual([
			"0000_inicial",
			"0028_controle_acesso",
			"0101_nfeserie_ambiente",
		]);
		expect(plano.pendentes.map(({ tag }) => tag)).toEqual([
			PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO,
			"0103_futura",
			"0104_futura",
		]);
	});

	it("registra somente hashes históricos ausentes", () => {
		const plano = planejarMigrationsProducao(
			migrations,
			new Set(["hash-0000", "hash-0102"]),
			true,
		);

		expect(plano.baseline.map(({ tag }) => tag)).toEqual([
			"0028_controle_acesso",
			"0101_nfeserie_ambiente",
		]);
		expect(plano.pendentes.map(({ tag }) => tag)).toEqual([
			"0103_futura",
			"0104_futura",
		]);
	});

	it("retoma da 0104 quando a 0103 já foi aplicada", () => {
		const plano = planejarMigrationsProducao(
			migrations,
			new Set([
				"hash-0000",
				"hash-0028",
				"hash-0101",
				"hash-0102",
				"hash-0103",
			]),
			true,
		);

		expect(plano.baseline).toEqual([]);
		expect(plano.pendentes.map(({ tag }) => tag)).toEqual(["0104_futura"]);
	});

	it("não cria baseline para banco vazio", () => {
		const plano = planejarMigrationsProducao(migrations, new Set(), false);

		expect(plano.baseline).toEqual([]);
		expect(plano.pendentes).toEqual(migrations);
	});

	it("preserva banco já corretamente migrado", () => {
		const plano = planejarMigrationsProducao(
			migrations,
			new Set(migrations.map(({ hash }) => hash)),
			true,
		);

		expect(plano).toEqual({ baseline: [], pendentes: [] });
	});

	it("falha de forma explícita se o corte não estiver no journal", () => {
		expect(() =>
			planejarMigrationsProducao(
				migrations.filter(
					({ tag }) => tag !== PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO,
				),
				new Set(),
				true,
			),
		).toThrow(
			`Migration de corte ${PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO} não encontrada no journal`,
		);
	});
});
