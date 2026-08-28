import { sql } from "drizzle-orm";
import {
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const ibptAliquota = pgTable(
	"ibpt_aliquota",
	{
		id: text().primaryKey().notNull(),
		uf: varchar({ length: 2 }).notNull(),
		ncm: varchar({ length: 8 }).notNull(),
		ex: varchar({ length: 10 }).default("0").notNull(),
		aliquotaNacional: numeric({ precision: 8, scale: 4 }).notNull(),
		aliquotaImportado: numeric({ precision: 8, scale: 4 }).notNull(),
		aliquotaEstadual: numeric({ precision: 8, scale: 4 }).notNull(),
		aliquotaMunicipal: numeric({ precision: 8, scale: 4 }).notNull(),
		chave: varchar({ length: 10 }).notNull(),
		fonte: varchar({ length: 80 })
			.default("IBPT/empresometro.com.br")
			.notNull(),
		versao: varchar({ length: 20 }),
		vigenciaInicio: varchar({ length: 10 }),
		vigenciaFim: varchar({ length: 10 }),
		importadoEm: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("ibpt_aliquota_uf_ncm_ex_key").on(
			table.uf,
			table.ncm,
			table.ex,
		),
	],
);

export const ibptImportacao = pgTable("ibpt_importacao", {
	id: text().primaryKey().notNull(),
	uf: varchar({ length: 2 }).notNull(),
	chave: varchar({ length: 10 }).notNull(),
	versao: varchar({ length: 20 }),
	fonte: varchar({ length: 80 }).default("IBPT/empresometro.com.br").notNull(),
	quantidadeRegistros: numeric({ precision: 12, scale: 0 }).notNull(),
	idusuario: text(),
	importadoEm: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});
