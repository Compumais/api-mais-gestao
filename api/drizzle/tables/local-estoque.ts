import { foreignKey, index, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const localestoque = pgTable(
  "localestoque",
  {
    id: text().primaryKey().notNull(),
    idempresa: text().notNull(),
    codigo: varchar({ length: 5 }),
    descricao: varchar({ length: 50 }),
    inativo: smallint(), // 0=Ativo, 1=Inativo
    posse: varchar({ length: 1 }), // 0=Propria, 1=Alugada
    tipo: smallint(), // 1=Estoque, 2=Produção
  },
  (table) => [
    index("localestoque_idempresa_idx").using(
      "btree",
      table.idempresa.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.idempresa],
      foreignColumns: [empresa.id],
      name: "localestoque_idempresa_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
)