import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { condicaopagamento } from "./condicao-pagamento.js";
import { contamesa } from "./conta-mesa.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { usuarios } from "./usuarios.js";

const numeric123 = () => numeric({ precision: 12, scale: 3, mode: "string" });

export const vendapdvgourmet = pgTable(
	"vendapdvgourmet",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcontamesa: text(),
		vendalocal: smallint().default(0), // 1=Sim, 0=Não
		numeropdv: integer().notNull(),
		idvendaitem: text(),
		valordinheiro: numeric123(),
		valorcartao: numeric123(),
		valorcartaocredito: numeric123(),
		valorcartaodebito: numeric123(),
		valorpix: numeric123(),
		valorprepago: numeric123(),
		valortroco: numeric123(),
		valortotal: numeric123(),
		deveemitirnfce: boolean().default(false).notNull(),
		idnotafiscalnfce: text(),
		identidade: text(),
		idcondicaopagto: text(),
		datacriacao: timestamp({ precision: 3, mode: "string" }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		dataalteracao: timestamp({ precision: 3, mode: "string" }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		usuarioquefechouvenda: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "vendapdvgourmet_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontamesa],
			foreignColumns: [contamesa.id],
			name: "vendapdvgourmet_idcontamesa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.usuarioquefechouvenda],
			foreignColumns: [usuarios.id],
			name: "vendapdvgourmet_usuarioquefechouvenda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "vendapdvgourmet_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcondicaopagto],
			foreignColumns: [condicaopagamento.id],
			name: "vendapdvgourmet_idcondicaopagto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
