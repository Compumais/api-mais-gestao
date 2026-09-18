import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	new URL(
		"../../../../drizzle/0102_notafiscalitem_campos_fiscais_finalizacao.sql",
		import.meta.url,
	),
	"utf8",
);

const workflowDeploy = readFileSync(
	new URL("../../../../../.github/workflows/deploy.yml", import.meta.url),
	"utf8",
);

const camposFiscaisPersistidosNaFinalizacao = [
	"basepis",
	"basecofins",
	"baseicmsst",
	"valoricmsst",
	"aliquotaicmsst",
	"basefcp",
	"valorfcp",
	"valorfcpst",
	"cest",
	"gerarcreditoipi",
	"gerarcreditoicmsst",
] as const;

describe("contrato de schema da finalização de nota fiscal de entrada", () => {
	it.each(
		camposFiscaisPersistidosNaFinalizacao,
	)("garante a coluna %s de forma idempotente", (campo) => {
		expect(migration).toMatch(
			new RegExp(`ADD COLUMN IF NOT EXISTS "${campo}"`, "i"),
		);
	});

	it("aplica a migration corretiva antes de publicar a API", () => {
		expect(workflowDeploy).toContain(
			"api/drizzle/0102_notafiscalitem_campos_fiscais_finalizacao.sql",
		);
	});
});
