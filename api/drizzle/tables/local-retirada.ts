import { foreignKey, index, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const localretirada = pgTable(
	"localretirada",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		bairro: varchar({ length: 60 }),
		cep: varchar({ length: 9 }),
		cnpjcpf: varchar({ length: 20 }),
		complemento: varchar({ length: 60 }),
		descricao: varchar({ length: 60 }),
		email: varchar({ length: 60 }),
		idcidade: text(),
		idestado: text(),
		idpais: text(),
		inscricaoestadual: varchar({ length: 20 }),
		logradouro: varchar({ length: 60 }),
		numero: varchar({ length: 60 }),
		razaosocialnome: varchar({ length: 60 }),
		telefone: varchar({ length: 40 }),
		tipopessoa: smallint(),
		tipotelefone: smallint(),
	},
	(table) => [
		index("localretirada_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "localretirada_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
