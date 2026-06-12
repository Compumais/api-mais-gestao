import { sql } from "drizzle-orm";
import {
	bigint,
	foreignKey,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { motivorebaixa } from "./motivo-rebaixa";
import { produtos } from "./produtos";
import { usuarios } from "./usuarios";

const numeric2110 = numeric({ precision: 21, scale: 10, mode: "string" });
const numeric52 = numeric({ precision: 5, scale: 2, mode: "string" });

export const custoproduto = pgTable(
	"custoproduto",
	{
		id: text().primaryKey().notNull(),
		adicional: numeric2110.default("0"), // Adicional
		casasdecimais: smallint(), // Casas decimais
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		custo: numeric2110, // Custo compra
		custoaquisicao: numeric2110, // Custo de aquisição
		customedio: numeric2110, // Custo médio
		datahora: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(), // Data
		desconto: numeric2110, // Desconto
		diferencialicms: numeric2110, // Diferencial de alíquota
		fcpst: numeric2110, // FCP ST
		freteconhecimento: numeric2110, // Frete do conhecimento de Transporte
		fretesegurooutrasdesp: numeric2110, // Frete + Seguro + Outras Despesas
		icmsdesonerado: numeric2110, // ICMS desonerado
		icmsfcp: numeric2110, // ICMS + FCP
		icmspiscofinsconhecimento: numeric2110, // ICMS + PIS + COFINS do conhecimento
		icmsst: numeric2110, // ICMS ST
		idcustoorigem: text(), // Id do custo de origem
		iddesmontagem: text(), // Id da desmontagem
		idfilial: text(), // Id da filial
		idmotivorebaixa: text(), // Id do motivo da rebaixa
		idnotafiscal: text(), // Id da Nota Fiscal
		idproduto: text().notNull(), // Id do produto
		idregistroproducao: text(), // Id do registro de produção
		idultimousuario: text(), // Id do último usuário
		importadopatch: smallint(), // Importado via patch
		ipi: numeric2110, // IPI
		lancamentospedcredito: numeric2110, // Lançamentos SPED crédito
		lancamentospeddebito: numeric2110, // Lançamentos SPED débito
		observacaorebaixa: text(), // Observação da rebaixa
		origem: smallint(), // Origem
		outrosvalorescredito: numeric2110, // Outros valores crédito
		outrosvaloresdebito: numeric2110, // Outros valores débito
		percentualadicional: numeric2110, // % Adicional
		percentualdiferencialicms: numeric52, // % Diferencial de alíquota
		percentualicmsfcp: numeric52, // % ICMS do custo manual
		percentualoutrosvalorescredito: numeric52, // % Outros valores crédito
		percentualoutrosvaloresdebito: numeric52, // % Outros valores débito
		percentualpiscofins: numeric52, // % PIS/COFINS do custo manual
		piscofins: numeric2110, // PIS + COFINS
		precocompra: numeric2110, // Preço de Compra
		rebaixa: numeric2110, // Rebaixa
		status: smallint(), // Status
		tipocalculoicms: smallint(), // Calcular ICMS/FCP por
		tipocalculopiscofins: smallint(), // Calcular PIS/COFINS por
		vendor: numeric2110, // Vendor
	},
	(table) => [
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "fk_custo_prod",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcustoorigem],
			foreignColumns: [table.id],
			name: "fk_custo_custoorigem",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idmotivorebaixa],
			foreignColumns: [motivorebaixa.id],
			name: "fk_custo_motivorebaixa",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idultimousuario],
			foreignColumns: [usuarios.id],
			name: "fk_custo_ultimousuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
