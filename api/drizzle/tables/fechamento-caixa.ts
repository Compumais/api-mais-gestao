import { sql } from "drizzle-orm";
import {
	bigint,
	foreignKey,
	index,
	numeric,
	pgTable,
	serial,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

const numeric152 = () => numeric({ precision: 15, scale: 2, mode: "string" });

export const fechamentopdv = pgTable(
	"fechamentopdv",
	{
		id: serial().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(),
		codigo: varchar({ length: 10 }), // Código do cadastro
		datacriacao: timestamp().default(sql`CURRENT_TIMESTAMP`), // Time millis da alteração do registro
		datamodificacao: timestamp().default(sql`CURRENT_TIMESTAMP`), // Time millis da alteração do registro
		datahora: timestamp({ precision: 3, mode: "string" }), // Data hora de criação do registro
		falta: numeric152(), // Valor da falta de caixa
		idoperacao: bigint({ mode: "number" }), // ID da operação que fechou o caixa
		idusuario: text(), // ID do usuário do caixa
		idusuariofechamento: text(), // ID do usuário de conferência na tesouraria
		idusuariosuprimento: text(), // ID do usuário que fez o suprimento inicial
		local: smallint(), // Identifica se cada PDV controla o seu saldo localmente
		novofechamento: smallint(), // Indica que a operação tem o ID do fechamento
		observacao: text(), // Observação sobre o fechamento
		pdv: smallint(), // Número do PDV
		saldoapurado: numeric152(), // Valor do saldo atual em caixa
		saldoconferido: numeric152(), // Valor conferido
		saldoinformado: numeric152(), // Valor do saldo informado no fechamento de caixa
		sobra: numeric152(), // Valor da sobra de caixa
		status: smallint(), // Status da movimentação
		suprimentoinicial: numeric152(), // Valor do suprimento inicial
		financeiroconsolidadoem: timestamp(), // Data/hora da consolidação financeira (dinheiro/PIX)
	},
	(table) => [
		index("fechamentopdv_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fechamentopdv_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "fk_fechamento_pdv_usuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariofechamento],
			foreignColumns: [usuarios.id],
			name: "fechamentopdv_idusuariofechamento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariosuprimento],
			foreignColumns: [usuarios.id],
			name: "fechamentopdv_idusuariosuprimento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
