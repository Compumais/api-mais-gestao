import { sql } from "drizzle-orm";
import { date, foreignKey, integer, numeric, pgTable, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { usuarios } from "./usuarios.js";

export const contamesa = pgTable(
  "contamesa",
  {
    id: text().primaryKey().notNull(),
    idempresa: text().notNull(),
    idcliente: text(),
    dataabertura: date().default(sql`CURRENT_DATE`),
    desconto: numeric({ precision: 12, scale: 2 }).default("0"),
    idgarcom: text(),
    idusuario: text().notNull(),
    numeromesa: integer().notNull(),
    numeropessoas: integer(),
    observacao: text(),
    status: smallint().default(0), // 1=Aberto, 2=Fechado, 3=Faturado, 99=Cancelado
    telefone: varchar({ length: 20 }), // Telefone do cliente,
    usuarioquefechouconta: text(),
    valorcartao: numeric({ precision: 12, scale: 3 }),
    valorcartaocredito: numeric({ precision: 12, scale: 3 }),
    valorcartaodebito: numeric({ precision: 12, scale: 3 }),
    valorcouverartistico: numeric({ precision: 12, scale: 3 }),
    valordinheiro: numeric({ precision: 12, scale: 3 }),
    valorpendente: numeric({ precision: 12, scale: 3 }),
    valorpix: numeric({ precision: 12, scale: 3 }),
    valorprepago: numeric({ precision: 12, scale: 3 }),
    valortaxaservico: numeric({ precision: 12, scale: 3 }),
    valortotal: numeric({ precision: 12, scale: 3 }),
    valortroco: numeric({ precision: 12, scale: 3 }),
    datacriacao: timestamp({ precision: 3, mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
    dataalteracao: timestamp({ precision: 3, mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.idempresa],
      foreignColumns: [empresa.id],
      name: "contamesa_idempresa_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idcliente],
      foreignColumns: [entidade.id],
      name: "contamesa_idcliente_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idgarcom],
      foreignColumns: [usuarios.id],
      name: "contamesa_idgarcom_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idusuario],
      foreignColumns: [usuarios.id],
      name: "contamesa_idusuario_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioquefechouconta],
      foreignColumns: [usuarios.id],
      name: "contamesa_usuarioquefechouconta_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
)