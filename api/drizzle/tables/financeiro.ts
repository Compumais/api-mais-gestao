import {
	bigint,
	char,
	date,
	doublePrecision,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { entidade } from "./entidade";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro";

export const financeiro = pgTable(
	"financeiro",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idempresa: text().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		identidade: text(),
		tipo: char({ length: 1 }), // P ou R
		tipoorigem: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idorigem: bigint({ mode: "number" }),
		parcela: smallint(),
		documento: varchar({ length: 60 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idtipodocumentofinanceiro: bigint({ mode: "number" }),
		status: char({ length: 1 }),
		emissao: date(),
		vencimento: date(),
		vencimentooriginal: date(),
		pagamento: date(),
		baixa: date(),
		valor: numeric({ precision: 12, scale: 2 }).default("0.00"),
		saldo: numeric({ precision: 12, scale: 2 }).default("0.00"),
		historico: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idbanco: text(),
		agencia: varchar({ length: 15 }),
		numerocontacorrente: varchar({ length: 40 }),
		cnpjcpfemitente: varchar({ length: 30 }),
		emitente: varchar({ length: 60 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		identidadedestino: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcodigocontabil: bigint({ mode: "number" }),
		juros: doublePrecision().default(0),
		multa: doublePrecision().default(0),
		taxafinanciamento: doublePrecision().default(0),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		evento: bigint({ mode: "number" }),
		devolucaocodigo: smallint(),
		devolucaodescricao: varchar({ length: 50 }),
		devolucaodata: date(),
		protestodate: date(),
		nossonumero: varchar({ length: 25 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontageraboleto: bigint({ mode: "number" }),
		numerocheque: varchar({ length: 10 }),
		remessagerada: smallint(),
		boletoimpresso: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idtipocobranca: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idrepresentante: bigint({ mode: "number" }),
		percentualcomissaofaturamento: numeric({ precision: 5, scale: 2 }),
		percentualcomissaoquitacao: numeric({ precision: 12, scale: 3 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		vencimentocalculoencargos: date(),
		valorbasecomissao: numeric({ precision: 12, scale: 3 }),
		valorpagorecebido: numeric({ precision: 12, scale: 3 }),
		codigobarras: varchar({ length: 100 }),
		codigodigitado: varchar({ length: 100 }),
		nomebandeira: varchar({ length: 50 }),
		valororiginalcomissao: numeric({ precision: 12, scale: 3 }),
		saldocomissao: numeric({ precision: 12, scale: 3 }),
		entrada: date(),
		registro: timestamp({ precision: 6, mode: "string" }),
		baixa2: date(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idportador: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcarteirageradauboleto: bigint({ mode: "number" }),
		tiporateiocentrocusto: smallint(),
		nomeadministradora: varchar({ length: 50 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		iddependente: bigint({ mode: "number" }),
		dvnossonumero: varchar({ length: 3 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idadministradora: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idbandeira: bigint({ mode: "number" }),
		ultimaocorrenciabancaria: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuariosupervisor: text(),
		dataliberacaousuariosupervisor: timestamp({ precision: 6, mode: "string" }),
		acaoprocessamentoretorno: varchar({ length: 50 }),
		instrucaocobrancaboleto: smallint(),
		diasinstrucaocobrancaboleto: smallint(),
		observacaoboleto: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idrepresentante2: bigint({ mode: "number" }),
		percentualcomissaoquitacao2: numeric({ precision: 12, scale: 3 }),
		valororiginalcomissao2: numeric({ precision: 12, scale: 3 }),
		saldocomissao2: numeric({ precision: 12, scale: 3 }),
		statusjob: smallint(),
		extra1: varchar({ length: 512 }),
		extra2: varchar({ length: 512 }),
		extra3: varchar({ length: 512 }),
		extra4: varchar({ length: 512 }),
		extra5: varchar({ length: 512 }),
		extra6: varchar({ length: 512 }),
		datareferencia: date(),
		urlqrcode: text(),
		tipointegracao: smallint(),
		referenciaparceiro: varchar({ length: 256 }),
		jsonretornodocumento: text(),
		totalparcelas: smallint(),
		urldocumento: text(),
		codigoecommerce: varchar({ length: 256 }),
		codigopedidoecommerce: varchar({ length: 256 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idconfiguracaoecommerce: bigint({ mode: "number" }),
		idpagamentoapi: varchar({ length: 256 }),
		autenticacaopagamentoapi: varchar({ length: 256 }),
		statuscobrancaonline: smallint(),
		extra7: varchar({ length: 512 }),
		extra8: varchar({ length: 512 }),
		extra9: varchar({ length: 512 }),
		extra10: varchar({ length: 512 }),
		extra11: varchar({ length: 512 }),
		extra12: varchar({ length: 512 }),
		extra13: varchar({ length: 512 }),
		extra14: varchar({ length: 512 }),
		extra15: varchar({ length: 512 }),
		extra16: varchar({ length: 512 }),
	},
	(table) => [
		index("idx_fin_entid_tipo_status").using(
			"btree",
			table.identidade.asc().nullsLast().op("int8_ops"),
			table.tipo.asc().nullsLast().op("bpchar_ops"),
			table.status.asc().nullsLast().op("bpchar_ops"),
		),
		index("idx_financeiro_emissao").using(
			"btree",
			table.emissao.asc().nullsLast().op("date_ops"),
		),
		index("idx_financeiro_idfilial").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("idx_financeiro_sped").using(
			"btree",
			table.idorigem.asc().nullsLast().op("int8_ops"),
			table.tipoorigem.asc().nullsLast().op("int2_ops"),
		),
		index("idx_financeiro_status").using(
			"btree",
			table.status.asc().nullsLast().op("bpchar_ops"),
		),
		index("idx_financeiro_tipo").using(
			"btree",
			table.tipo.asc().nullsLast().op("bpchar_ops"),
		),
		index("idx_financeiro_vencimento").using(
			"btree",
			table.vencimento.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "financeiro_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "financeiro_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "financeiro_idtipodocumentofinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		// foreignKey({
		// 	columns: [table.idrepresentante],
		// 	foreignColumns: [representante.id],
		// 	name: "financeiro_idrepresentante_fkey",
		// })
		// 	.onUpdate("cascade")
		// 	.onDelete("set null"),
	],
);
