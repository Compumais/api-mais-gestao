import { sql } from "drizzle-orm";
import {
	foreignKey,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { featuresSaas } from "./features-saas.js";
import { planosSaas } from "./planos-saas.js";

export const planoSaasFeatures = pgTable(
	"plano_saas_features",
	{
		idplano: text("idplano").notNull(),
		idfeature: text("idfeature").notNull(),
		criadoem: timestamp("criadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.idplano, table.idfeature],
			name: "plano_saas_features_pkey",
		}),
		foreignKey({
			columns: [table.idplano],
			foreignColumns: [planosSaas.id],
			name: "plano_saas_features_idplano_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idfeature],
			foreignColumns: [featuresSaas.id],
			name: "plano_saas_features_idfeature_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
