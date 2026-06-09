import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	char,
	date,
	doublePrecision,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", {
		withTimezone: true,
		mode: "string",
	}),
	startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

// ---------------- Tabelas do Better Auth ----------------

export const sessoes = pgTable(
	"sessoes",
	{
		id: text("id").primaryKey(),
		expiraem: timestamp("expiraem").notNull(),
		token: text("token").notNull().unique(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		enderecoip: text("enderecoip"),
		useragent: text("useragent"),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
	},
	(table) => [index("sessoes_idusuario_idx").on(table.idusuario)],
);

export const contas = pgTable(
	"contas",
	{
		id: text("id").primaryKey(),
		idconta: text("idconta").notNull(),
		idprovedor: text("idprovedor").notNull(),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		acessotoken: text("acessotoken"),
		refreshtoken: text("refreshtoken"),
		idtoken: text("idtoken"),
		acessotokenexpiraem: timestamp("acessotokenexpiraem"),
		refreshtokenexpiraem: timestamp("refreshtokenexpiraem"),
		escopo: text("escopo"),
		password: text("password"),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("contas_idusuario_idx").on(table.idusuario)],
);

export const verificacoes = pgTable(
	"verificacoes",
	{
		id: text("id").primaryKey(),
		identificador: text("identificador").notNull(),
		valor: text("valor").notNull(),
		expiraem: timestamp("expiraem").notNull(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verificacoes_identificador_idx").on(table.identificador)],
);

export const usuarios = pgTable("usuarios", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	perfil: jsonb("perfil").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
	maxempresas: integer("maxempresas"),
	email: text("email").notNull().unique(),
	emailverificado: boolean("emailverificado").default(false).notNull(),
	imagem: text("imagem"),
	plano: text("plano"), // BASIC, PREMIUM, ENTERPRISE
	plano_inicio_ciclo: date("plano_inicio_ciclo"),
	plano_fim_ciclo: date("plano_fim_ciclo"),
	plano_proximo: text("plano_proximo"), // Plano agendado para downgrade
	criadoem: timestamp("criadoem").defaultNow().notNull(),
	atualizadoem: timestamp("atualizadoem")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// ---------------- Tabelas do sistema ----------------

// Tabela cadastro de empresas
export const empresa = pgTable(
	"empresas",
	{
		id: text().primaryKey().notNull(),
		nome: text().notNull(),
		cnpj: text().notNull(),
		telefone: text().notNull(),
		email: text().default("").notNull(),
		endereco: text().default("").notNull(),
		idproprietario: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("empresas_cnpj_key").using(
			"btree",
			table.cnpj.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idproprietario],
			foreignColumns: [usuarios.id],
			name: "empresas_idproprietario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const usuarioEmpresa = pgTable(
	"usuario_empresas",
	{
		id: text().primaryKey().notNull(),
		idusuario: text().notNull(),
		idempresa: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "usuario_empresas_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "usuario_empresas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: text().primaryKey().notNull(),
		acao: text().notNull(),
		recurso: text().notNull(),
		idrecurso: text(),
		idusuario: text(),
		idempresa: text(),
		metadados: jsonb(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "audit_logs_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const entidade = pgTable(
	"entidade",
	{
		id: text().primaryKey().notNull(),
		nome: varchar({ length: 60 }).notNull(),
		razaosocial: varchar({ length: 60 }),
		tipopessoa: smallint().default(0),
		cnpjcpf: varchar({ length: 20 }).notNull(),
		inscricaoestadual: varchar({ length: 20 }),
		rg: varchar({ length: 20 }),
		email: varchar({ length: 200 }),
		telefone: varchar({ length: 40 }),
		endereco: varchar({ length: 60 }),
		numeroendereco: varchar({ length: 6 }),
		complemento: varchar({ length: 50 }),
		bairro: varchar({ length: 50 }),
		idcidade: text(),
		idestado: text(),
		cep: varchar({ length: 6 }),
		fax: varchar({ length: 40 }),
		nascimento: date(),
		idplanocontas: text(),
		pais: text(),
		idempresa: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("entidades_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("entidades_email_idx").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "entidades_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contacorrente = pgTable("contacorrente", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: text().primaryKey().notNull(),
	descricao: varchar({ length: 50 }),
	idempresa: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	codigo: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idbanco: text(),
	agencia: varchar({ length: 25 }),
	abertura: date(),
	numeroconta: varchar({ length: 40 }),
	gerente: varchar({ length: 40 }),
	telefonegerente: varchar({ length: 20 }),
	cnpjcpftitular: varchar({ length: 20 }),
	observacao: varchar({ length: 150 }),
	agenciadv: varchar({ length: 1 }),
	contadv: varchar({ length: 2 }),
	codigocedente: varchar({ length: 20 }),
	codigocedentedv: varchar({ length: 1 }),
	carteira: varchar({ length: 6 }),
	operacao: varchar({ length: 5 }),
	aceite: smallint().default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	nossonumeroseq: bigint({ mode: "number" }),
	codigofornecidoagencia: varchar({ length: 10 }),
	codigofornecidoagenciadv: varchar({ length: 2 }),
	instrucao1: varchar({ length: 100 }),
	instrucao2: varchar({ length: 100 }),
	instrucao3: varchar({ length: 100 }),
	instrucao4: varchar({ length: 100 }),
	especiedocumento: varchar({ length: 3 }),
	tamanhocodigobarras: smallint().default(0),
	tipoimpressao: smallint().default(0),
	bancoemiteboleto: smallint(),
	arquivolicenca: varchar({ length: 255 }),
	diasprotesto: smallint(),
	layoutarquivoremessa: varchar({ length: 100 }),
	sequenciaremessa: integer(),
	outrodadoconfiguracao1: varchar({ length: 20 }),
	outrodadoconfiguracao2: varchar({ length: 20 }),
	layoutarquivoretorno: varchar({ length: 100 }),
	layoutboleto: varchar({ length: 255 }),
	caixa: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idfilial: bigint({ mode: "number" }),
	codigoinstrucao1: varchar({ length: 10 }),
	codigoinstrucao2: varchar({ length: 10 }),
	codigoinstrucao3: varchar({ length: 10 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	currenttimemillis: bigint({ mode: "number" }),
	nometitular: varchar({ length: 20 }),
	aceitecobrebem: varchar({ length: 5 }),
	layoutboletopredefinido: varchar({ length: 255 }),
	nomearquivoremessa: varchar({ length: 50 }),
	formatoarquivo: smallint(),
	alturapapelboleto: smallint(),
	margemsuperiorboleto: smallint(),
	margemesquerdaboleto: smallint(),
	naogerarmensagemprotesto: smallint(),
	naogerarmensagemjuros: smallint(),
	naogerarmensagemmulta: smallint(),
	naogerarinstrucaocaixaremessa: smallint(),
	localpagamentoboleto: varchar({ length: 200 }),
	dadoscedentecomprovantesacado: smallint(),
	naousarfatorvencimento: smallint(),
	valorinstrucao1: varchar({ length: 20 }),
	valorinstrucao2: varchar({ length: 20 }),
	valorinstrucao3: varchar({ length: 20 }),
	processaretornonumerodocumento: smallint(),
	razaosocial: varchar({ length: 60 }),
	cnpj: varchar({ length: 18 }),
	cep: varchar({ length: 9 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idestado: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idcidade: bigint({ mode: "number" }),
	endereco: varchar({ length: 50 }),
	numeroendereco: varchar({ length: 6 }),
	bairro: varchar({ length: 50 }),
	inativo: smallint(),
	bancogeranossonumero: smallint(),
	emissaoboleto: smallint(),
	distribuicaoboleto: smallint(),
	tipoprotesto: smallint(),
	tipojuros: smallint(),
	tipomulta: smallint(),
	naogerarregistrodetalhe3: smallint(),
	postobeneficiario: varchar({ length: 5 }),
	tipoimpressaouboleto: smallint(),
	tipoidentificacaobeneficiario: smallint(),
	tipoidentificacaoentidade: smallint(),
	caminhoimagemboleto: varchar({ length: 255 }),
	redimensionarimagemboleto: smallint(),
	localimpressaoinstrucaouboleto: smallint(),
	caixapadrao: smallint(),
	numerobeneficiarioboleto: varchar({ length: 30 }),
	numeroversaolayoutarquivo: varchar({ length: 3 }),
	numeroversaolayoutlote: varchar({ length: 3 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idconveniado: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idcontacontabilintegracao: bigint({ mode: "number" }),
	valoracrescimo: numeric({ precision: 10, scale: 2 }),
	codificacaoarquivoremessa: varchar({ length: 10 }),
	jurosencargos: numeric({ precision: 12, scale: 2 }),
	multaencargos: numeric({ precision: 12, scale: 2 }),
	// TODO: failed to parse database type 'bytea'
	imagemboleto: text("imagemboleto"),
	tipovalidacaoarquivoretorno: smallint(),
	codigooperacao: varchar({ length: 20 }),
	geracaonossonumero: smallint(),
	calcularencargosfinanceiros: smallint(),
	descontoantecipacao: numeric({ precision: 5, scale: 2 }),
	desconsiderasabado: smallint(),
	desconsideradomingo: smallint(),
	diasdesconsiderarjuros: smallint(),
	diasdesconsiderarmulta: smallint(),
	diasdesconsiderardesconto: smallint(),
	receberpixpdv: smallint(),
	chavepix: varchar({ length: 100 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	identidade: bigint({ mode: "number" }),
	tipointegracao: smallint(),
	chaveapi: varchar({ length: 512 }),
	tipoambienteintegracao: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idcertificadointegracao: bigint({ mode: "number" }),
	diaslimitepagamento: smallint(),
});

export const contacorrentelancamento = pgTable(
	"contacorrentelancamento",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontacorrente: text().notNull(),
		datahora: date(),
		tipo: char({ length: 1 }), // E ou S
		valor: numeric({ precision: 12, scale: 2 }),
		saldoanterior: numeric({ precision: 12, scale: 2 }),
		saldoatual: numeric({ precision: 12, scale: 2 }),
		historico: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuario: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idplanocontas: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		evento: bigint({ mode: "number" }),
		debito: numeric({ precision: 12, scale: 2 }),
		documento: varchar({ length: 30 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		identificado: smallint(),
		depositonaoidentificado: smallint(),
		tiporateiocentrocusto: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idlancamentotransferencia: bigint({ mode: "number" }),
		dataconciliacao: date(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuarioconciliacao: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idlancamentoestornado: bigint({ mode: "number" }),
	},
	(table) => [
		index("idx_contacorrentelanc_evento").using(
			"btree",
			table.evento.asc().nullsLast().op("int8_ops"),
		),
	],
);

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
	],
);

export const financeirolancamento = pgTable(
	"financeirolancamento",
	{
		id: text().primaryKey().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idfinanceiro: text().notNull(),
		valoranterior: numeric({ precision: 12, scale: 2 }),
		desconto: numeric({ precision: 12, scale: 2 }),
		valor: numeric({ precision: 12, scale: 2 }),
		pagamento: date(),
		baixa: timestamp({ precision: 6, mode: "string" }),
		juros: numeric({ precision: 12, scale: 2 }),
		multa: numeric({ precision: 12, scale: 2 }),
		usuario: varchar({ length: 10 }),
		cancelado: smallint().default(sql`(0)`),
		datahoracancelado: timestamp({ precision: 6, mode: "string" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		evento: bigint({ mode: "number" }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		historico: text(),
		reabertura: numeric({ precision: 12, scale: 2 }),
		observacao: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		valorsubstituido: numeric({ precision: 12, scale: 2 }),
		valordevolucao: numeric({ precision: 12, scale: 2 }),
		datavencimentoanterior: date(),
		valorbaixa: numeric({ precision: 12, scale: 2 }),
		acrescimo: numeric({ precision: 12, scale: 2 }),
		baixa2: date(),
		idplanocontasjuros: smallint(),
		idplanocontasmulta: smallint(),
		idplanocontasdesconto: smallint(),
		idplanocontasacrescimo: smallint(),
		tiporateiocentrocustojuros: smallint(),
		tiporateiocentrocustomulta: smallint(),
		tiporateiocentrocustodesconto: smallint(),
		tiporateiocentrocustoacrescimo: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idportadoranterior: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idtipocobrancaanterior: bigint({ mode: "number" }),
		automatico: smallint(),
	},
	(table) => [
		index("idx_finlan_evento").using(
			"btree",
			table.evento.asc().nullsLast().op("int8_ops"),
		),
		index("idx_finlan_idfinanceiro").using(
			"btree",
			table.idfinanceiro.asc().nullsLast().op("text_ops"),
		),
	],
);

export const planocontas = pgTable(
	"planocontas",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 30 }),
		nome: varchar({ length: 40 }),
		tipomovimento: varchar({ length: 1 }),
		inativo: smallint(),
		classe: varchar({ length: 2 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		centrocustoobrigatorio: smallint(),
		tipoconta: integer(), // 1 - Receita, 2 - Despesa, 3 - Investimento, 4 - Transferência
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontacontabilintegracao: bigint({ mode: "number" }),
		exportaparacontabilidade: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idgrupodre: bigint({ mode: "number" }),
		idplanocontas: text(),
	},
	(table) => [
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [table.id],
			name: "planocontas_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const tipodocumentofinanceiro = pgTable("tipodocumentofinanceiro", {
	id: text().primaryKey().notNull(),
	descricao: varchar({ length: 50 }).notNull(),
	acao: integer().notNull(),
	saidafechamento: integer().default(0),
	inativo: integer().default(0),
	integracaixabanco: integer().default(0),
	baixageracodigobanco: integer().default(0),
	currenttimemillis: bigint({ mode: "number" }).notNull(),
	permitegerarboleto: integer(),
	idmotivobaixafinanceiro: text(),
	utilizadoemnegociao: integer(),
	enviamobile: integer(),
	tipousuario: integer().default(0),
	localusoboleto: integer().default(0),
	resgatarboleto: integer().default(0),
	calcularencargofinanceiro: integer(),
	juros: integer().default(0),
	multa: integer().default(0),
	descontoantecipacao: integer().default(0),
	desconsiderasabado: integer().default(0),
	desconsideradependente: integer().default(0),
	diasdeconsiderarjuros: integer().default(0),
	diasdeconsiderarmulta: integer().default(0),
	diasdesconsiderardesconto: integer().default(0),
	tipocalculojuros: integer(),
	consideraparainadimplencia: integer().default(0),
	enviaecommerce: integer(),
	formapagamentonfe: varchar(),
	tipocobrancasaas: integer(),
	codigomercos: integer(),
	idempresa: text().notNull(),
});

export const motivobaixafinanceiro = pgTable("motivobaixafinanceiro", {
	id: text().primaryKey().notNull(),
	idempresa: text().notNull(),
	descricao: varchar({ length: 50 }).notNull(),
	inativo: integer().default(0),
	currenttimemillis: bigint({ mode: "number" }).notNull(),
});

export const banco = pgTable(
	"banco",
	{
		id: text().primaryKey().notNull(),
		codigo: varchar({ length: 6 }).notNull(),
		nome: varchar({ length: 60 }).notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		idempresa: text()
			.notNull()
			.references(() => empresa.id, {
				onDelete: "cascade",
			}),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "banco_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const clientesAsaas = pgTable(
	"clientes_asaas",
	{
		id: text("id").primaryKey().notNull(),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		idclienteasaas: text("idclienteasaas").notNull(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
	},
	(table) => [index("clientes_asaas_idempresa_idx").on(table.idempresa)],
);

export const assinaturas = pgTable(
	"assinaturas",
	{
		id: text("id").primaryKey().notNull(),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		idassinaturaasaas: text("idassinaturaasaas").notNull(),
		status: text("status").notNull(), // ACTIVE, EXPIRED, OVERDUE...
		plano: text("plano").notNull(), // BASIC, PREMIUM
		valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
		ciclo: text("ciclo").notNull(), // MONTHLY
		proximovencimento: date("proximovencimento"),
		urlpagamento: text("urlpagamento"),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("assinaturas_idempresa_idx").on(table.idempresa),
		index("assinaturas_idassinaturaasaas_idx").on(table.idassinaturaasaas),
	],
);

export const configuracoes = pgTable(
	"configuracoes",
	{
		id: text()
			.primaryKey()
			.notNull()
			.$defaultFn(() => randomUUID()),
		idempresa: text().notNull(),
		// Configurações de notificações
		notificacoes: jsonb("notificacoes")
			.$type<{
				alertasFinanceiros: {
					vencimentoContas: {
						habilitado: boolean;
						diasAntes: number;
					};
					saldoBaixo: {
						habilitado: boolean;
						valorMinimo: string;
					};
					transferenciasAcimaValor: {
						habilitado: boolean;
						valorLimite: string;
					};
					conciliacoesPendentes: {
						habilitado: boolean;
						diasPendentes: number;
					};
				};
				notificacoesEmail: {
					relatoriosAutomaticos: {
						habilitado: boolean;
						frequencia: "diario" | "semanal" | "mensal" | null;
						horario: string;
					};
					resumoMovimentacoes: {
						habilitado: boolean;
						frequencia: "diario" | "semanal" | "mensal" | null;
					};
					alertasVencimento: {
						habilitado: boolean;
						diasAntes: number;
					};
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de integração
		integracao: jsonb("integracao")
			.$type<{
				apis: {
					chaves: Array<{
						id: string;
						nome: string;
						chave: string;
						criadoEm: string;
						ultimoUso: string | null;
						ativo: boolean;
					}>;
				};
				webhooks: Array<{
					id: string;
					url: string;
					eventos: string[];
					ativo: boolean;
					criadoEm: string;
				}>;
				integracoesBancos: {
					habilitado: boolean;
					provedor: string | null;
					configuracoes: Record<string, unknown>;
				};
				exportacao: {
					formatoPadrao: "csv" | "excel" | "pdf";
					incluirCabecalho: boolean;
					separador: string;
				};
				backup: {
					habilitado: boolean;
					frequencia: "diario" | "semanal" | "mensal" | null;
					horario: string;
					manterBackups: number;
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de relatórios
		relatorios: jsonb("relatorios")
			.$type<{
				templates: Array<{
					id: string;
					nome: string;
					tipo: string;
					configuracoes: Record<string, unknown>;
				}>;
				padroes: {
					periodo: "mes" | "trimestre" | "semestre" | "ano" | "personalizado";
					agrupamentos: string[];
					filtros: Record<string, unknown>;
				};
			}>()
			.default(sql`'{}'::jsonb`),
		// Configurações de impressão
		impressao: jsonb("impressao")
			.$type<{
				cabecalho: {
					texto: string | null;
					logo: string | null;
				};
				rodape: {
					texto: string | null;
				};
				documentosFiscais: {
					incluirLogo: boolean;
					incluirDadosEmpresa: boolean;
					dadosEmpresa: {
						razaoSocial: boolean;
						cnpj: boolean;
						endereco: boolean;
						contato: boolean;
					};
				};
			}>()
			.default(sql`'{}'::jsonb`),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("configuracoes_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "configuracoes_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const configuracoesUsuario = pgTable(
	"configuracoes_usuario",
	{
		id: text().primaryKey().notNull(),
		idusuario: text().notNull(),
		// Configurações de integrações globais
		integracoes: jsonb("integracoes")
			.$type<{
				geminiApiKey?: string;
				openaiApiKey?: string;
				openrouterApiKey?: string;
				asaasToken?: string;
			}>()
			.default(sql`'{}'::jsonb`),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("configuracoes_usuario_idusuario_key").on(table.idusuario),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "configuracoes_usuario_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const centrocusto = pgTable(
	"centrocusto",
	{
		id: text().primaryKey().notNull(),
		codigoextenso: varchar({ length: 85 }),
		codigoreduzido: varchar({ length: 20 }),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idempresa: text().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		inativo: integer().default(0),
		obrigatorio: integer().default(0),
		idcentrocustopai: text(),
		nivelcentro: integer(),
		nivelcentro1: varchar({ length: 20 }),
		nivelcentro2: varchar({ length: 20 }),
		nivelcentro3: varchar({ length: 20 }),
		nivelcentro4: varchar({ length: 20 }),
		nivelcentro5: varchar({ length: 20 }),
		nivelcentro6: varchar({ length: 20 }),
		nivelcentro7: varchar({ length: 20 }),
		nivelcentro8: varchar({ length: 20 }),
		nivelcentro9: varchar({ length: 20 }),
		nome: varchar({ length: 50 }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "centrocusto_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "centrocusto_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "centrocusto_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcentrocustopai],
			foreignColumns: [table.id],
			name: "centrocusto_idcentrocustopai_fkey",
		}),
	],
);

export const entidadecontacontabil = pgTable(
	"entidadecontacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontacontabil: text().notNull(),
		idempresa: text().notNull(),
		identidade: text().notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "entidadecontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacontabil],
			foreignColumns: [contacontabil.id],
			name: "entidadecontacontabil_idcontacontabil_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "entidadecontacontabil_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "entidadecontacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "entidadecontacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contacontabil = pgTable(
	"contacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontapai: text(),
		idempresa: text().notNull(),
		inativo: integer().default(0),
		descricao: varchar({ length: 100 }).notNull(),
		codigocontareferencial: varchar({ length: 60 }),
		codigoextenso: varchar({ length: 85 }),
		codigoreduzido: varchar({ length: 20 }),
		contaglutinadora: integer(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		natureza: varchar({ length: 1 }),
		nivelconta: integer(),
		numeronivel1: varchar({ length: 20 }),
		numeronivel2: varchar({ length: 20 }),
		numeronivel3: varchar({ length: 20 }),
		numeronivel4: varchar({ length: 20 }),
		numeronivel5: varchar({ length: 20 }),
		numeronivel6: varchar({ length: 20 }),
		numeronivel7: varchar({ length: 20 }),
		numeronivel8: varchar({ length: 20 }),
		numeronivel9: varchar({ length: 20 }),
		tipocontacontabil: varchar({ length: 1 }),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "contacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "contacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontapai],
			foreignColumns: [table.id],
			name: "contacontabil_idcontapai_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const codigoreduzidocontacontabil = pgTable(
	"codigoreduzidocontacontabil",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "codigoreduzidocontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "codigoreduzidocontacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "codigoreduzidocontacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const integracaocontabilconfiguracao = pgTable(
	"integracaocontabilconfiguracao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		contabilizarclifordiversos: bigint({ mode: "number" }).default(0),
		idcontabaixarpagar: text(),
		idcontabaixarreceber: text(),
		idcontaclientediversos: text(),
		idcontafornecedordiversos: text(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "integracaocontabilconfiguracao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontabaixarpagar],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontabaixarpagar_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontabaixarreceber],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontabaixarreceber_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontaclientediversos],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontaclientediversos_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontafornecedordiversos],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontafornecedordiversos_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const planocontascontacontabil = pgTable(
	"planocontascontacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontacontabil: text(),
		idempresa: text(),
		idplanocontas: text(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "planocontascontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacontabil],
			foreignColumns: [contacontabil.id],
			name: "planocontascontacontabil_idcontacontabil_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "planocontascontacontabil_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const notificacoes = pgTable(
	"notificacoes",
	{
		id: text().primaryKey().notNull(),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		tipo: varchar("tipo", { length: 50 }).notNull(),
		idrecurso: text("idrecurso"),
		titulo: text("titulo").notNull(),
		detalhes: jsonb("detalhes").$type<Record<string, unknown>>(),
		lida: boolean("lida").default(false).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("notificacoes_idusuario_idx").on(table.idusuario),
		index("notificacoes_idusuario_lida_idx").on(table.idusuario, table.lida),
	]
);

export const cest = pgTable(
	"cest",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
		descricao: text().notNull(),
		descricaoncm: text().notNull(),
		codigo: varchar({ length: 10 }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "cest_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
);

export const produtos = pgTable(
	"produtos",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		descricao: varchar({ length: 100 }).notNull(),
		aliquotacofins: numeric({ precision: 12, scale: 2 }),
		aliquotaconfinsentrada: numeric({ precision: 12, scale: 2 }),
		aliquotafcpnf: numeric({ precision: 12, scale: 2 }),
		aliquotaicmsdiferencialentrada: numeric({ precision: 12, scale: 2 }),
		aliquotaicmsinterna: numeric({ precision: 12, scale: 2 }),
		aliquotapis: numeric({ precision: 12, scale: 2 }),
		aliquotapisconfinsentradapreco: numeric({ precision: 12, scale: 2 }),
		aliquotapisconfinssaidapreco: numeric({ precision: 12, scale: 2 }),
		aliquotapisentrada: numeric({ precision: 12, scale: 2 }),
		aliquotareducaoicmsnfcesat: numeric({ precision: 12, scale: 2 }),
		alteraprecopdv: integer(),
		alturashop: numeric({ precision: 12, scale: 2 }),
		anofabricacao: integer(),
		anomodelofabricacao: integer(),
		atualizacaopreco: date(),
		baseicmsconhecimento: numeric({ precision: 12, scale: 2 }),
		baseipiultimanota: numeric({ precision: 12, scale: 2 }),
		basepiscofinsconhecimento: numeric({ precision: 12, scale: 2 }),
		basepiscofinsentradapreco: numeric({ precision: 12, scale: 2 }),
		caminhoicone: varchar(),
		caminhoimagem: varchar(),
		cest: integer(),
		cfopvendaecf: integer(),
		codigo: integer(),
		comissao: numeric({ precision: 12, scale: 2 }),
		comissaoavista: numeric({ precision: 12, scale: 2 }),
		comissaoprazo: numeric({ precision: 12, scale: 2 }),
		cstcofins: numeric({ precision: 12, scale: 2 }),
		cstcofinsentrada: numeric({ precision: 12, scale: 2 }),
		cstpis: numeric({ precision: 12, scale: 2 }),
		cstpisentrada: numeric({ precision: 12, scale: 2 }),
		cstservico: numeric({ precision: 12, scale: 2 }),
		custoalteradopor: text(),
		custoaquisicao: numeric({ precision: 12, scale: 2 }),
		custoindireto: numeric({ precision: 12, scale: 2 }),
		customedioinicial: numeric({ precision: 12, scale: 2 }),
		customediopendente: numeric({ precision: 12, scale: 2 }),
		custovariavelgestaopreco: numeric({ precision: 12, scale: 2 }),
		dataalteracao: date(),
		dataalteracaopreco: date(),
		dataultimacompra: date(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		diferencialicmsgestaocusto: numeric({ precision: 12, scale: 2 }),
		diferidoicmsentrada: numeric({ precision: 12, scale: 2 }),
		ean: integer(),
		eantributavel: integer(),
		endereco: text(),
		fatorconversao: numeric({ precision: 12, scale: 2 }),
		fatorconversaoalternativo: numeric({ precision: 12, scale: 2 }),
		fatorconversaoproducao: numeric({ precision: 12, scale: 2 }),
		fatorconversaounidadeetq: numeric({ precision: 12, scale: 2 }),
		fcpstentrada: numeric({ precision: 12, scale: 2 }),
		fornecedor: text(),
		freteconhecimento: numeric({ precision: 12, scale: 2 }),
		fretegratismercadolivre: integer(),
		freteoutrasdespesas: numeric({ precision: 12, scale: 2 }),
		funrural: integer(),
		icmsconhecimento: numeric({ precision: 12, scale: 2 }),
		icmsentrada: numeric({ precision: 12, scale: 2 }),
		icmssaida: numeric({ precision: 12, scale: 2 }),
		icmsstentrada: numeric({ precision: 12, scale: 2 }),
		icone: text(),
		idbasecalculocredito: text(),
		idbeneficiofiscalnf: text(),
		idbeneficiofiscaloperacao: text(),
		idcest: text(),
		idcfopcontroleperda: text(),
		idcfopentrada: text(),
		idcfopentradadevolucaoexterna: text(),
		idcfopentradadevolucaointerna: text(),
		idcfopentradaexterna: text(),
		idcfopentradatransfexterna: text(),
		idcfopentradatransfinterna: text(),
		idunidademedida: text(),
		idcfopsaida: text(),
		idcfopsaidadevolucaoexterna: text(),
		idcfopsaidadevolucaointerna: text(),
		idcfopsaidaexterna: text(),
		idcfopsaidaexternanaocontrib: text(),
		idcfopsaidanfce: text(),
		idcfopsaidatransfexterna: text(),
		idcfopsaidatransfinterna: text(),
		idclassificacaofiscal: text(),
		idcomprador: text(),
		idcontribuicaoprevidenciaria: text(),
		idcontribuicaosocialapurada: text(),
		idcontribuicaosocialapurcofins: text(),
		idcreditoestimulado: text(),
		iddepartamento: text(),
		idenquadramentoipientrada: text(),
		idenquadramentoipisaida: text(),
		identificaconsumidor: text(),
		idfabricante: text(),
		idfornecedor: text(),
		idmotivorebaixa: text(),
		idncm: text(),
		idplanocontas: text(),
		idreceitasemcontribuicao: text(),
		imagem: text(),
		ipi: numeric({ precision: 12, scale: 2 }),
		ipientrada: numeric({ precision: 12, scale: 2 }),
		ipiultimanota: numeric({ precision: 12, scale: 2 }),
		ippt: varchar({ length: 1 }), // P=Mercadoria manugaturada, T=Mercadoria manufaturada por terceiros;
		kit: integer(), // 0=Produto nao e kit, 1=Produto um kit
		modalidadeicmsst: integer(),
		modocalculoipi: integer(),
		modocalculoipientrada: integer(),
		modocalculopreco: integer(),
		motivodesoneracaoicms: integer(),
		motivodesoneracaonf: integer(),
		ncm: varchar({ length: 10 }),
		nome: varchar({ length: 120 }).notNull(),
		nomeecf: varchar({ length: 120 }),
		numerofci: varchar({ length: 36 }),
		observacoes: text(),
		opcional: integer(), // 0=Produto nao e opcional, 1=Produto e opcional
		origem: integer(), // 0=Nacional, 1=Estrangeira - Importação direta, 2=Estrangeira - Adquirida no mercado interno
		origemcusto: integer(), // 0=NF, 1=Usuário, 2=Registro de produção
		outrasdespesasgestaopreco: numeric({ precision: 5, scale: 2 }),
		outrosimpostoscusto: numeric({ precision: 15, scale: 6 }),
		outrosvalorescredgestaocusto: numeric({ precision: 5, scale: 2 }),
		outrosvaloresdebgestaocusto: numeric({ precision: 5, scale: 2 }),
		pedevendedor: integer(),
		percentualfcpentrada: numeric({ precision: 15, scale: 6 }),
		percentualfcpstentrada: numeric({ precision: 15, scale: 6 }),
		percentualfreteoutrasdespesas: numeric({ precision: 15, scale: 6 }),
		percentualipisaida: numeric({ precision: 5, scale: 2 }),
		percentuallucroajustado: numeric({ precision: 12, scale: 2 }),
		percentualreducaoicms: numeric({ precision: 7, scale: 4 }),
		percentualreducaomva: numeric({ precision: 5, scale: 2 }),
		percoutrosvalorespreco: numeric({ precision: 5, scale: 2 }),
		percredbasepiscofinsentrada: numeric({ precision: 5, scale: 2 }),
		percredbasepiscofinssaida: numeric({ precision: 5, scale: 2 }),
		pesavel: integer(), // 0=Produto nao e pesavel, 1=Produto e pesavel
		peso: numeric({ precision: 12, scale: 2 }),
		podeserbrinde: integer(), // 0=Produto nao pode ser brinde, 1=Produto pode ser brinde
		precoultimacompra: numeric({ precision: 12, scale: 2 }),
		quantidademaxima: integer(),
		quantidademinima: integer(),
		quantidadepadrao: integer(),
		situacaotributariasn: varchar({ length: 3 }),
		situacaotributariasnentrada: varchar({ length: 3 }),
		tipo: varchar({ length: 1 }), // P=Produto, S=Serviço
		tipofatorconversaounidadeetq: integer(), // 1=Multiplcação, 2=Divisão
		tipoporcao: integer(), // 0=Grama, 1=Militro, 2=Unidade
		tipoproduto: varchar({ length: 2 }),
		tipoquantidade: integer(),
		tributacao: varchar({ length: 7 }),
		tributacaoespecial: varchar({ length: 7 }),
		tributacaoespecialnfcesat: varchar({ length: 3 }),
		tributacaosn: varchar({ length: 3 }),
		ultimaaliquotafcpst: numeric({ precision: 12, scale: 2 }),
		ultimaaliquotaicmsst: numeric({ precision: 12, scale: 2 }),
		ultimabasefcpst: numeric({ precision: 12, scale: 2 }),
		ultimodescontonotaentrada: numeric({ precision: 12, scale: 2 }),
		ultimovalorfcpst: numeric({ precision: 12, scale: 2 }),
		ultimovaloricmsst: numeric({ precision: 12, scale: 2 }),
		ultimovaloricmssubstituto: numeric({ precision: 12, scale: 2 }),
		unidademedida: varchar({ length: 6 }),
		valoricmsdiferencialentrada: numeric({ precision: 12, scale: 2 }),
		valoricmsst: numeric({ precision: 12, scale: 2 }),
		valoripiultimanota: numeric({ precision: 12, scale: 2 }),
		valorlancamentospedcusto: numeric({ precision: 12, scale: 2 }),
		valorlancamentospedcustodebito: numeric({ precision: 12, scale: 2 }),
		venderpeloprecototal: integer(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "produtos_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.fornecedor],
			foreignColumns: [entidade.id],
			name: "produtos_fornecedor_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcomprador],
			foreignColumns: [entidade.id],
			name: "produtos_idcomprador_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopcontroleperda],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopcontroleperda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopsaidanfce],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopsaidanfce_fkey",
		})
			.onUpdate("cascade")
			.onUpdate("cascade"),
		foreignKey({
			columns: [table.idcfopentrada],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentrada_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopsaida],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopsaida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaoexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradadevolucaoexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaointerna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradadevolucaointerna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradaexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradaexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradatransfexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradatransfexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaointerna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradatransfinterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "produtos_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idncm],
			foreignColumns: [ncm.id],
			name: "produtos_idncm_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcest],
			foreignColumns: [table.id],
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idunidademedida],
			foreignColumns: [unidademedida.id],
			name: "produtos_idunidademedida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idreceitasemcontribuicao],
			foreignColumns: [receitasemcontribuicao.id],
			name: "produtos_idreceitasemcontribuicao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const cfop = pgTable(
	"cfop",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		abatericmsbasepiscofins: smallint(), // Abater o ICMS da base do PIS/COFINS
		abatericmsdesonbasepiscofins: smallint(), // Abater o ICMS desonerado da base do PIS/COFINS
		abatericmsst30: smallint(), // Abater ICMS da situação tributária 30 do ICMS de substituição
		adicionarpiscofinsinfcomp: smallint(), // Indica se o PIS e COFINS irá ser informado nas informações adicionais
		aliquotacofins: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS
		aliquotacofinsentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS
		aliquotacofinsretido: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
		aliquotaipientrada: numeric({ precision: 12, scale: 4 }), // % IPI de entrada
		aliquotaipisaida: numeric({ precision: 12, scale: 4 }), // % IPI de saída
		aliquotapis: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS
		aliquotapisentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS
		aliquotapisretido: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
		calculabaseicmsparaelemesmo: smallint(), // Calcula base de ICMS para ele mesmo
		calculafundocombatepobreza: smallint(), // Calcula fundo de combate a pobreza
		calculardifalcomaliquotazero: smallint(), // Calcular DIFAL com alíquota zero
		calculardiferencialaliqicmsst: smallint(), // Calcular diferencial de alíquotas do ICMS ST
		calcularicmsefetivo: varchar({ length: 1 }), // Calcular ICMS efetivo
		calcularicmsstpelocusto: smallint(), // Calcular ICMS ST pelo custo
		calcularimpostoaproximado: smallint(), // Calcular imposto aproximado
		cfopentradasped: varchar({ length: 3 }), // Cfop entrada sped
		cfopsaidasped: varchar({ length: 3 }), // Cfop saída sped
		codigo: varchar({ length: 20 }), // Código
		codigoantecipacao: integer(), // Código antecipação sintegra
		codigocfopservicog2ka: varchar({ length: 1 }), // Codigo cfop serviço G2ka
		conferencianotafiscal: smallint(), // Nota fiscal precisa de conferência
		conferenciapedido: smallint(), // Relacionar pedido de compra para conferência financeira
		configuracaoadicionalnfse1: varchar({ length: 10 }), // Configuração adicional 1 da NFS-e
		configuracaoadicionalnfse2: varchar({ length: 10 }), // Configuração adicional 2 da NFS-e
		configuracaoadicionalnfse3: varchar({ length: 10 }), // Configuração adicional 3 da NFS-e
		consideracustomedio: smallint(), // Utilizada para calculo custo médio das mercadorias
		consideradespaduanbaseicms: smallint(), // Considera despesas aduaneiras na base do ICMS
		consideradevolucaovenda: smallint(), // Considera devolução de venda
		considerafretebaseipi: smallint(), // Somar valor do frete na base de IPI
		consideraicmsstbasepiscofins: smallint(), // Considera ICMS substituição tributária na base do PIS/COFINS
		consideraimpimportacaobaseicms: smallint(), // Considera imposto de importação na base do ICMS
		considerainscricaoestadualsub: smallint(), // Utilizar a incrição estadual de substituto
		consideraiofbaseicms: smallint(), // Considera IOF na base do ICMS
		consideraipi: smallint(), // Destaca IPI?
		consideraipibaseicms: smallint(), // Indica se o IPI será considerado na base de cálculo do ICMS
		consideraipibaseicmsst: smallint(), // Indica se o IPI será considerado na base de cálculo do ICMS ST
		consideraipibasepiscofins: smallint(), // Considera IPI na base do PIS/COFINS
		consideraoutdespbaseipi: smallint(), // Somar valor de outras despesas na base de IPI
		considerarcofinsbaseicms: smallint(), // Considerar valor do COFINS na base de cáculo do ICMS
		considerardespimpbasepiscof: smallint(), // Considerar despesas de importação na base de cálculo de PIS/COFINS
		considerarpisbaseicms: smallint(), // Considerar valor do PIS na base de cáculo do ICMS
		considerarproduto: smallint(), // Considerar produtos na nota fiscal
		considerarservico: smallint(), // Considerar serviços na nota fiscal
		consideravenda: smallint(), // Considera a natureza de operação fiscal como venda - 0=Não 1=Sim
		consignacao: smallint(), // Consignação
		consignacaoentrada: smallint(), // Consignação de entrada
		consumidorfinal: smallint(), // Consumidor final
		contranotafunrural: smallint(), // Contra nota FUNRURAL
		contribuinte: integer(), // Contribuinte?
		controlasaldofiscal: smallint(), // Controla estoque de terceiros
		cstac: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Acre
		cstal: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Alagoas
		cstam: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Amazonas
		cstap: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Amapá
		cstba: varchar({ length: 3 }), // Situação tributária do ICMS para o estado da Bahia
		cstce: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Ceara
		cstcofins: varchar({ length: 2 }), // Situação tributária do COFINS
		cstcofinsentrada: varchar({ length: 2 }), // Situção tributária do COFINS
		cstdf: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Distrito Federal
		cstes: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Espirito Santo
		cstex: varchar({ length: 3 }), // Situação tributária do ICMS para o exterior
		cstgo: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Goias
		cstipientrada: varchar({ length: 3 }), // Situação tributária do IPI de entrada
		cstipisaida: varchar({ length: 3 }), // Situação tributária do IPI de saída
		cstma: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Maranhã
		cstmg: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Minas Gerais
		cstms: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Mato Grosso do Sul
		cstmt: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Mato Grosso
		cstpa: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Pará
		cstpb: varchar({ length: 3 }), // Situação tributária do ICMS para o estado da Paraiba
		cstpe: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Pernambuco
		cstpi: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Piauí
		cstpis: varchar({ length: 2 }), // Situação tributária do PIS
		cstpisentrada: varchar({ length: 2 }), // Situção tributária do PIS
		cstpr: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Paraná
		cstrj: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio de Janeiro
		cstrn: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio Grande do Norte
		cstro: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Rondonia
		cstrr: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Roraima
		cstrs: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio Grande do Sul
		cstsc: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Santa Catarina
		cstse: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Sergipe
		cstservico: varchar({ length: 3 }), // CST Serviço
		cstsp: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de São Paulo
		cstto: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Tocantins
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		descricao: varchar({ length: 1024 }), // Descrição
		descricaocompleta: varchar({ length: 320 }), // Descrição completa
		destaqueimposto: smallint(), // Destaca imposto
		digitarimpostositemnotasaida: smallint(), // Permitir digitar impostos do item na nota fiscal de saída
		digitartotalitemmanualmente: smallint(), // Digitar valor do item pelo valor total
		enviartagicmsstretzero: smallint(), // Enviar Tags do ICMS ST retido zerado
		enviartagsdiferimentototal: smallint(), // Enviar informações de diferimento total na NF-e
		exigirdocumentoreferenciado: smallint(), // Exigir documento fiscal referenciado
		finalidadeemissaonfe: smallint(), // Finalidade emissão NF-e
		forcaricmssn: smallint(), // Forçar cálculo de ICMS mesmo quando empresa é Simples Nacional
		forcaripidevolvido: smallint(), // Forçar IPI devolvido
		fundamentacaolegalestado: varchar({ length: 100 }), // Fundamentação legal do Estado
		gerarcreditoicmsst: smallint(), // Gerar crédito ICMS ST
		gerarcreditoipi: smallint(), // Gerar crédito IPI
		habilitabaseipiitemnota: smallint(), // Habilita campo de base de IPI no item da nota fiscal
		habilitabasepiscofinsitemnota: smallint(), // Habilita campo de base de PIS/COFINS no item da nota fiscal
		icmsac: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Acre
		icmsal: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Alagoas
		icmsam: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Amazonas
		icmsap: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Amapá
		icmsba: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado da Bahia
		icmsce: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Ceara
		icmsdevidouforigemconhecimento: smallint(), // ICMS devido à UF de origem de prestação.
		icmsdf: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Distrito Federal
		icmses: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Espirito Santo
		icmsex: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o exterior
		icmsgo: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Goias
		icmsma: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Maranhã
		icmsmg: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Minas Gerais
		icmsms: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Mato Grosso do Sul
		icmsmt: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Mato Grosso
		icmspa: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Pará
		icmspb: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado da Paraiba
		icmspe: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Pernambuco
		icmspi: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Piauí
		icmspr: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Paraná
		icmsrj: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio de Janeiro
		icmsrn: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio Grande do Norte
		icmsro: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Rondonia
		icmsrr: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Roraima
		icmsrs: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio Grande do Sul
		icmssc: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Santa Catarina
		icmsse: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Sergipe
		icmssp: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de São Paulo
		icmsstac: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Acre
		icmsstal: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Alagoas
		icmsstam: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Amazonas
		icmsstap: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Amapá
		icmsstba: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado da Bahia
		icmsstce: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Ceara
		icmsstdf: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Distrito Federal
		icmsstes: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Espirito Santo
		icmsstex: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o exterior
		icmsstgo: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Goias
		icmsstma: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Maranhã
		icmsstmg: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Minas Gerais
		icmsstms: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Mato Grosso do Sul
		icmsstmt: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Mato Grosso
		icmsstpa: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Pará
		icmsstpb: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado da Paraiba
		icmsstpe: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Pernambuco
		icmsstpi: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Piauí
		icmsstpr: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Paraná
		icmsstrj: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio de Janeiro
		icmsstrn: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio Grande do Norte
		icmsstro: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Rondonia
		icmsstrr: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Roraima
		icmsstrs: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio Grande do Sul
		icmsstsc: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Santa Catarina
		icmsstse: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Sergipe
		icmsstsp: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de São Paulo
		icmsstto: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Tocantins
		icmsto: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Tocantins
		idajusteapuracaoicmsdevoluc: bigint({ mode: "number" }), // Ajuste apuração do ICMS para devolução
		idajusteapuracaoipidevoluc: bigint({ mode: "number" }), // Ajuste apuração do IPI para devolução
		idajustedocfiscalcreditoicms: bigint({ mode: "number" }), // Ajuste do documento fiscal para crédito de ICMS
		idbasecalculocredito: bigint({ mode: "number" }), // Base de cálculo de credito
		idcondicaopagamento: bigint({ mode: "number" }), // ID da condição de pagamento
		idcontribuicaosocialapurada: bigint({ mode: "number" }), // Contribuição social apurada
		idcontribuicaosocialapurcofins: bigint({ mode: "number" }), // Contribuição social apurada cofins
		idenquadramentoipientrada: bigint({ mode: "number" }), // ID do enquadramento de IPI de entrada
		idenquadramentoipisaida: bigint({ mode: "number" }), // ID do enquadramento de IPI de saída
		identidadeoperacaofiscal: bigint({ mode: "number" }), // ID da entidade da operação fiscal
		idestadodestino: bigint({ mode: "number" }), // ID do estado destino
		idestadoorigem: bigint({ mode: "number" }), // ID do estado origem
		idfilial: bigint({ mode: "number" }), // ID da filial de origem
		idincentivofiscalorigem: bigint({ mode: "number" }), // ID do incentivo fiscal origem
		idnaturezadevolucao: bigint({ mode: "number" }), // ID da natureza de operação de devolução do cliente
		idnaturezanaocontribuinte: bigint({ mode: "number" }), // ID da natureza de operação não contribuinte
		idnaturezaoperacaoinversa: bigint({ mode: "number" }), // ID da natureza de operação inversa
		idnbs: bigint({ mode: "number" }), // ID da Nomenclatura Comum do Mercosul
		idobslancfiscalcreditoicms: bigint({ mode: "number" }), // Observação do lançamento fiscal para crédito de ICMS
		idoperacaofiscal: bigint({ mode: "number" }), // ID da operação fiscal
		idplanocontas: bigint({ mode: "number" }), // ID do plano de contas
		idreceitasemcontribuicao: bigint({ mode: "number" }), // Receita sem contribuição
		idtipocredito: bigint({ mode: "number" }), // Tipo de crédito
		idtipodocumentofinanceiro: bigint({ mode: "number" }), // ID do tipo de documento financeiro
		idtipoentidadeopfiscal: bigint({ mode: "number" }), // Tipo de cliente para operação fiscal
		importacao: smallint(), // CFOP é de importação
		inativa: smallint(), // Inativa
		informartotaismanualmente: smallint(), // Permitir informar totais de impostos manualmente
		integracao: smallint(), // Integração com o financeiro 0=Sem;1=Contas a receber;2=Contas a pagar
		interestadualdestmesmauf: smallint(), // Permite CFOP interestadual para destinatário da mesma UF e CNPJ
		iss: numeric({ precision: 7, scale: 4 }), // Percentual do ISS
		modocalculoipientrada: smallint(), // Modo de cálculo do IPI de entrada
		modocalculoipisaida: smallint(), // Modo de cálculo do IPI de saída
		movimentoregistroc170: smallint(), // Define a movimentaçãoo do item no registro como 1 (não teve)
		multiplicadorbaseicms: numeric({ precision: 12, scale: 6 }), // Multiplicador de base de ICMS
		naoabaterfcpinternofcpst: smallint(), // Não abater FCP interno do FCP ST
		naoaplicarmva: smallint(), // Não aplicar MVA
		naobaixarestoque: smallint(), // Nao baixar estoque
		naoconsiddescontobaseicms: smallint(), // Não considera desconto na base do ICMS
		naoconsiddescontobaseicmsst: smallint(), // Não considera desconto na base do PIS/COFINS
		naoconsiddescontobasepiscofins: smallint(), // Não considera desconto na base do ICMS ST
		naoconsiddescontocontsocial: smallint(), // Não considerar desconto na base da Contribuição Social
		naoconsiddescontoimpostorenda: smallint(), // Não considerar desconto na base do IR
		naoconsiddescontoinss: smallint(), // Não considerar desconto na base do INSS
		naoconsiddescontoiss: smallint(), // Não considerar desconto na base do ISS
		naoconsiddescpiscofinsretido: smallint(), // Retem INSS de serviço
		naoconsiderafretebaseicms: smallint(), // Não considerar frete na base de cálculo de ICMS
		naoconsiderafretebaseicmsst: smallint(), // Não considerar frete na base de cálculo de ICMS ST
		naoconsideraoutdespbaseicms: smallint(), // Não considerar outras despesas na base de cálculo de ICMS
		naoconsiderapiscofinsproduto: smallint(), // Não considera PIS/COFINS do produto (considera da cfop)
		naoconsiderarvlnotafiscalitem: varchar({ length: 3 }), // Não considerar valor da nota fiscal item
		naoconsideratribespecproduto: smallint(), // Indica se a tributação especial indicada no produto será considerada na incusão na nota fiscal
		naoconsidfretebasepiscofins: smallint(), // Nota complementar
		naoconsidoutdespbasepiscofins: smallint(), // Nota complementar
		naoconsidoutrasdespbaseicmsst: smallint(), // Não considera outras despesas na base do ICMS ST
		naoconsidsegbasepiscofins: smallint(), // Nota complementar
		naogeracreditopiscofins: smallint(), // Não gerar crédito PIS/COFINS
		naomostrarreducaoicmsst: smallint(), // Não mostrar reduçao de ICMS ST
		naosomarfretenototal: smallint(), // Não somar frete no valor total
		notacomplementar: smallint(), // Nota complementar
		observacaoitemnotafiscal: text(), // Observação padrão na impressão do item da NF
		observacaonotafiscal: text(), // Observação padrão na impressão da NF
		observacaonotafiscalfisco: text(), // Observação padrão na impressão da NF
		operacaocomcreditodeestimulo: smallint(), // Operação com crédito de estímulo
		ordemoperacaofiscal: smallint(), // Ordem da operação fiscal
		percaproveitamentoicmslc123: numeric({ precision: 7, scale: 4 }), // % aproveitamento ICMS LC123
		perccontribuicaosocial: numeric({ precision: 5, scale: 2 }), // Percentual de contribuição social
		percentualfunrural: numeric({ precision: 5, scale: 2 }), // Percentual FUNRURAL
		percentualpartilhadifal: numeric({ precision: 5, scale: 2 }), // % Partilha DIFAL
		percimpostorenda: numeric({ precision: 5, scale: 2 }), // Percentual de imposto de renda
		percinss: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
		percreducaoinss: numeric({ precision: 5, scale: 2 }), // % de Redução de INSS
		permitecreditopiscofinspf: smallint(), // Permite crédito de PIS/COFINS para pessoa física
		permitenfnormalsomentealiqicms: smallint(), // Permitir nota fiscal somente com % de ICMS
		permitenotasemvalor: smallint(), // Nota sem valor
		permitirbaixarlotevencido: smallint(), // Permitir baixar estoque de lote vencido em modo PEPS
		permitircfopinternaopexterior: smallint(), // Permite CFOP interna para operação com exterior
		posseitem: varchar({ length: 1 }), // Remessa para terceiros
		possuiincentivosfiscais: smallint(), // Possui incentivos fiscais
		possuirepasseicmsst: smallint(), // Possui repasse para o ICMS ST
		presencaconsumidor: smallint(), // Presença do consumidor
		reducaoicmsac: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Acre
		reducaoicmsal: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Alagoas
		reducaoicmsam: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Amazonas
		reducaoicmsap: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Amapá
		reducaoicmsba: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado da Bahia
		reducaoicmsce: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Ceara
		reducaoicmsdf: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Distrito Federal
		reducaoicmses: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Espirito Santo
		reducaoicmsex: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o exterior
		reducaoicmsgo: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Goias
		reducaoicmsma: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Maranhã
		reducaoicmsmg: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Minas Gerais
		reducaoicmsms: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Mato Grosso do Sul
		reducaoicmsmt: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Mato Grosso
		reducaoicmspa: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Pará
		reducaoicmspb: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado da Paraiba
		reducaoicmspe: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Pernambuco
		reducaoicmspi: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Piauí
		reducaoicmspr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Paraná
		reducaoicmsrj: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio de Janeiro
		reducaoicmsrn: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio Grande do Norte
		reducaoicmsro: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Rondonia
		reducaoicmsrr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Roraima
		reducaoicmsrs: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio Grande do Sul
		reducaoicmssc: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Santa Catarina
		reducaoicmsse: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Sergipe
		reducaoicmssp: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de São Paulo
		reducaoicmsstac: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Acre
		reducaoicmsstal: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Alagoas
		reducaoicmsstam: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Amazonas
		reducaoicmsstap: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Amapá
		reducaoicmsstba: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado da Bahia
		reducaoicmsstce: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Ceara
		reducaoicmsstdf: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Distrito Federal
		reducaoicmsstes: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Espirito Santo
		reducaoicmsstex: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o exterior
		reducaoicmsstgo: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Goias
		reducaoicmsstma: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Maranhã
		reducaoicmsstmg: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Minas Gerais
		reducaoicmsstms: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Mato Grosso do Sul
		reducaoicmsstmt: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Mato Grosso
		reducaoicmsstpa: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Pará
		reducaoicmsstpb: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado da Paraiba
		reducaoicmsstpe: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Pernambuco
		reducaoicmsstpi: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Piauí
		reducaoicmsstpr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Paraná
		reducaoicmsstrj: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio de Janeiro
		reducaoicmsstrn: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio Grande do Norte
		reducaoicmsstro: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Rondonia
		reducaoicmsstrr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Roraima
		reducaoicmsstrs: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio Grande do Sul
		reducaoicmsstsc: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Santa Catarina
		reducaoicmsstse: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Sergipe
		reducaoicmsstsp: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de São Paulo
		reducaoicmsstto: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Tocantins
		reducaoicmsto: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Tocantins
		reducaoiss: numeric({ precision: 7, scale: 4 }), // Percentual de redução do ISS
		regimeespecial: smallint(), // Documento fiscal emitido com base em regime especial ou norma especifica
		registrarproducaovenda: smallint(), // Registrar produção na venda
		retencaoiss: numeric({ precision: 7, scale: 4 }), // Retenção do ISS
		retercontribuicaosocial: smallint(), // Retem contribuição social de serviço
		reterimpostorenda: smallint(), // Retem imposto de renda de serviço
		reterinss: smallint(), // Retem INSS de serviço
		reterpiscofins: smallint(), // Retem PIS/COFINS de serviço
		semrepercussaofiscalpe: smallint(), // Sem repercussão fiscal
		situacaotributaria: varchar({ length: 3 }), // Código da situaçao tributaria do ICMS
		situacaotributariasn: varchar({ length: 3 }), // Código da situaçao tributaria do ICMS do SN
		somarafrmmtotal: smallint(), // Somar AFRMM no valor total
		somarcofinsoutrasdesp: smallint(), // Somar COFINS nas outras despesas
		somarcofinstotal: smallint(), // Somar valor do COFINS no total da nota fiscal
		somardespacesoutrasdesp: smallint(), // Somar despesas acessórias nas outras despesas
		somardespesasaduaneirastotal: smallint(), // Somar valor das despesas aduaneiras no total da nota fiscal
		somaricmsoutrasdesp: smallint(), // Somar ICMS nas outras despesas
		somaricmstotal: smallint(), // Somar valor do ICMS no total da nota fiscal
		somariitotalproduto: smallint(), // Indica se o valor do imposto de importação irá somar no total dos produtos
		somarpisoutrasdesp: smallint(), // Somar PIS nas outras despesas
		somarpistotal: smallint(), // Somar valor do PIS no total da nota fiscal
		somarsiscomexoutrasdesp: smallint(), // Somar taxa SISCOMEX nas outras despesas
		somarsiscomextotal: smallint(), // Somar valor do SISCOMEX no total da nota fiscal
		tipocalculoicmsretant: smallint(), // Buscar ICMS ST cobrado anteriormente
		tipoenquadramento: smallint(), // Tipo de enquadramento fiscal
		tipoenquadramentoorigem: smallint(), // Tipo de enquadramento fiscal
		tipoproduto: varchar({ length: 2 }), // Tipo de produto
		tiporemessaemterceiros: smallint(), // Tipo de remessa em terceiros
		tipovalorpreco: smallint(), // Tipo do valor do preço unitário na nota fiscal
		tributacaoespecial: varchar({ length: 6 }), // Identificador de tributação especial
		tributacaoservico: varchar({ length: 7 }), // Tributação pafa o PAF-ECF
		tributamunicipioprestador: smallint(), // Indica se serviço é tributado no município de origem
		utilizartodasoperacoes: smallint(), // Utilizar em todas as operações
		valorminimoretencao: numeric({ precision: 12, scale: 2 }), // Valor mínimo das retenções
		zerarfcpterceiros: smallint(), // Zerar FCP em nota de entrada de terceiros
	},
);

export const cfoppadrao = pgTable(
	"cfoppadrao",
	{
		id: text().primaryKey().notNull(),
		finalidade: varchar({ length: 1024 }).notNull(),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
		nome: varchar({ length: 1024 }).notNull(),
		codigo: varchar({ length: 20 }).notNull(),
	}
);

export const departamento = pgTable(
	"departamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 20 }).notNull(),
		descricao: varchar({ length: 12 }).notNull(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "departamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "departamento_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "departamento_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
);

export const enquatramentoipi = pgTable(
	"enquatramentoipi",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 20 }).notNull(),
		descricao: varchar({ length: 100 }).notNull(),
		grupocst: varchar({ length: 20 }).notNull(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
);

// Cadastro de grupo de produtos
export const hierarquia = pgTable(
	"hierarquia",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		aliquotacofins: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS de Saída
		aliquotacofinsentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS de Entrada
		aliquotafcp: numeric({ precision: 5, scale: 2 }), // Percentual de Fundo de combate a pobreza
		aliquotafcpnf: numeric({ precision: 5, scale: 2 }), // Aliquota do FCP para a Nota Fiscal
		aliquotaicmsinterna: numeric({ precision: 5, scale: 2 }), // Percentual da aliquota de ICMS dentro do estado usada pelo PAF-ECF
		aliquotaicmsnf: numeric({ precision: 5, scale: 2 }), // Aliquota do ICMS para a Nota Fiscal
		aliquotapis: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS de Saída
		aliquotapisentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS de entrada
		aliquotareducaoicmsnfcesat: numeric({ precision: 7, scale: 4 }), // Percentual da aliquota de redução ICMS para NFCE/SAT
		classe: smallint(), // Identifica o tipo de estoque: 0 = Revenda; 1 = Matéria prima; 2 = Mat. embalagem; 3 = Consumo interno
		codigo: varchar({ length: 30 }), // Código
		comissao: numeric({ precision: 5, scale: 2 }), // Percentual de comissão
		comissaoaprazo: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo
		comissaoaprazopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 1
		comissaoaprazopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 2
		comissaoaprazopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 3
		comissaoaprazopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 4
		comissaoavista: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista
		comissaoavistapauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 1
		comissaoavistapauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 2
		comissaoavistapauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 3
		comissaoavistapauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 4
		comissaogestaopreco: numeric({ precision: 5, scale: 2 }), // % Comissão margem - Gestão
		comissaopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 1
		comissaopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 2
		comissaopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 3
		comissaopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 4
		comissaoquitacao: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação
		comissaoquitacaopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 1
		comissaoquitacaopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 2
		comissaoquitacaopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 3
		comissaoquitacaopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 4
		cstcofins: varchar({ length: 2 }), // Situção tributária do COFINS de Saída
		cstcofinsentrada: varchar({ length: 2 }), // Situção tributária do COFINS de Entrada
		csticms: varchar({ length: 3 }), // Código da situaçao tributaria de saída do ICMS
		cstpis: varchar({ length: 2 }), // Situção tributária do PIS de Saída
		cstpisentrada: varchar({ length: 2 }), // Situção tributária do PIS de Entrada
		cstsnicms: varchar({ length: 3 }), // Código da situaçao tributaria de saída do ICMS para o Simples Nacional
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		custovariavelgestaopreco: numeric({ precision: 5, scale: 2 }), // % Custo variável margem - Gestão
		diferencialicmsgestaocusto: numeric({ precision: 5, scale: 2 }), // % Diferencial ICMS - Gestão
		enviamobile: smallint(), // Identifica se este grupo será enviado ao Unimobile Vendas
		iat: char({ length: 1 }), // Indicador de arredondamento ou truncamento. A=Arredondamento; T=Truncamento
		icone: text(), // Icone (bytea)
		idbasecalculocredito: text(), // Base de cálculo de credito
		idbeneficiofiscalnf: text(), // Benefício Fiscal
		idbeneficiofiscaloperacao: text(), // Benefício Fiscal
		idcest: text(), // ID do CEST
		idcomprador: text(), // ID do comprador
		idcontribuicaoprevidenciaria: text(), // ID Receita sem contribuição
		idcontribuicaosocialapurada: text(), // ID Contribuição social apurada
		idcontribuicaosocialapurcofins: text(), // Contribuição social apurada cofins
		identificacliente: smallint(), // Determina se vai ser necessário identificar o cliente nas vendas do PAF-ECF
		identificaconsumidor: smallint(), // Força identificar o consumidor no pdv
		idncm: text(), // ID da Nomenclatura Comum do Mercosul
		idreceitasemcontribuicao: text(), // ID Receita sem contribuição
		idtabelafinanciamento: text(), // Id da tabela de financiamento
		idtabelamva: text(), // ID tabela MVA
		idtipocredito: text(), // ID Tipo de crédito
		ipi: numeric({ precision: 5, scale: 2 }), // Percentual de IPI de saída
		ipientrada: numeric({ precision: 5, scale: 2 }), // Percentual de IPI de entrada
		ippt: char({ length: 1 }), // Indicador de produção própria ou de terceiros. P=Próprio; T=Terceiros
		lucrobrutomaximo: numeric({ precision: 12, scale: 2 }), // Lucro bruto máximo
		lucrobrutominimo: numeric({ precision: 12, scale: 2 }), // Lucro bruto mínimo
		modalidadeicmsst: smallint(), // Modalidade de determinação da base de cálculo do ICMS de substituição
		modocalculoipi: smallint(), // Modo de cálculo do IPI de saida
		modocalculoipientrada: smallint(), // Modo de cálculo do IPI de etnrada
		motivodesoneracaoicms: smallint(), // Motivo desoneracao ICMS
		motivodesoneracaonf: smallint(), // Motivo desoneração NF
		ncm: varchar({ length: 10 }), // Nomenclatura Comum do Mercosul
		nome: varchar({ length: 40 }), // Nome
		nummaxcombinacoes: integer(), // Número máximo de combinações
		origem: smallint(), // Origem do produto - 0=Nacional; 1=Importação direta; 2=Adquirida no mercado interno
		outrasdespesasgestaopreco: numeric({ precision: 5, scale: 2 }), // % Outras Despesas margem - Gestão
		outrosimpostosgestaopreco: numeric({ precision: 5, scale: 2 }), // % Outros impostos margem - Gestão
		outrosvalorescredgestaocusto: numeric({ precision: 5, scale: 2 }), // % Outros valores débito - Gestão
		outrosvaloresdebgestaocusto: numeric({ precision: 5, scale: 2 }), // % Outros valores crédito - Gestão
		pedevendedor: smallint(), // Identifica se é necessário identificar o vendedor nas vendas pelo PAF-ECF
		percentualcustoindireto: numeric({ precision: 5, scale: 2 }), // Custo operacional do grupo de produto
		percentualmarkdownmaximo: numeric({ precision: 12, scale: 2 }), // Percentual markdown máximo
		percentualmarkdownminimo: numeric({ precision: 12, scale: 2 }), // Percentual markdown mínimo
		percentualmarkupmaximo: numeric({ precision: 12, scale: 2 }), // Percentual markup máximo
		percentualmarkupminimo: numeric({ precision: 12, scale: 2 }), // Percentual markup mínimo
		percentualreducaoicms: numeric({ precision: 7, scale: 4 }), // Percentual de redução do ICMS
		percentualreducaomva: numeric({ precision: 5, scale: 2 }), // Percentual de reduçao de MVA
		possuialiquotacombatepobreza: smallint(), // Identificação se o produto possui alíquota do fundo de combate à pobreza
		precodiferenciado: smallint(), // Preço diferenciado
		prefixogrupoproduto: varchar({ length: 10 }), // Prefixo do grupo de produto
		produtoseramodelofichatecnica: smallint(), // Produto será modelo de ficha técnica
		produtoteracotacao: smallint(), // Identifica se o produto tera cotação
		situacaotributariaentrada: varchar({ length: 3 }), // Código da situaçao tributaria de entrada do ICMS
		situacaotributariaipi: varchar({ length: 3 }), // Situação tributaria do IPI de saída
		situacaotributariaipientrada: varchar({ length: 3 }), // Situação tributaria do IPI de entrada
		situacaotributariasnentrada: varchar({ length: 3 }), // Código da situaçao tributaria de entrada do ICMS para o Simples Nacional
		tabelafinanciamento: varchar({ length: 6 }), // Código da tabela de financiamento
		tipoproduto: varchar({ length: 2 }), // Tipo de produto
		tributacao: varchar({ length: 7 }), // Tributação do produto para o PAF-ECF
		tributacaoespecial: varchar({ length: 7 }), // Tributação especial
		tributacaoespecialnfcesat: varchar({ length: 3 }), // Situação tributária especial para NFC-e/SAT
		tributacaosn: varchar({ length: 3 }), // Tributação para NFC-e do Simples Nacional
		valoricmsst: numeric({ precision: 12, scale: 2 }), // Percentual da modalidade de determinação da base de cálculo do ICMS de substituição
	},
	(table) => [
		index("hierarquia_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "hierarquia_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcest],
			foreignColumns: [cest.id],
			name: "fk_hierarquia_cest",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcomprador],
			foreignColumns: [entidade.id],
			name: "fk_hierarquia_comprador",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

// Cadastro de Nomenclatura Comum do Mercosul (NCM)
export const ncm = pgTable(
	"ncm",
	{
		id: text().primaryKey().notNull(), // Id
		idempresa: text().notNull(), // ID da empresa
		codigo: varchar({ length: 10 }), // Código
		codigoexcecao: varchar({ length: 3 }), // Codigo de exceção de NCM - de acordo com a tabela de incidencia do imposto de produtos industrializados (TIPI)
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		descricao: text(), // Descrição
		idnaturezaoperacaoestado: text(), // ID da tabela de natureza de operação por estado
		idtabelamva: text(), // ID da tabela de MVA
		inativo: smallint(), // Inativo
		modalidadebcicmsst: smallint(), // Modalidade BC do ICMS ST
		percentualimpostoaproximado: numeric({ precision: 5, scale: 2 }), // Percentual aproximado de impostos
		percentualmva: numeric({ precision: 5, scale: 2 }), // Percentual do MVA
		percentualreducaomva: numeric({ precision: 5, scale: 2 }), // Percentual de redução do MVA
		percimpostoaproximportacao: numeric({ precision: 5, scale: 2 }), // Percentual aproximado de impostos para produto importado
		tipo: smallint(), // Tipo de registro
	},
	(table) => [
		index("ncm_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ncm_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ncm_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

// Cadastro de unidade de medidas
export const unidademedida = pgTable(
	"unidademedida",
	{
		id: text().primaryKey().notNull(), // ID da unidade de medida
		idempresa: text().notNull(), // ID da empresa
		casasdecimais: smallint(), // Casas decimais
		codigo: varchar({ length: 6 }), // Código
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		nome: varchar({ length: 50 }), // Descrição
		tipovalor: smallint(), // Tipo de valor
	},
	(table) => [
		index("unidademedida_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("unidademedida_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "unidademedida_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

// Cadastro de receitas sem contribuição
export const receitasemcontribuicao = pgTable(
	"receitasemcontribuicao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		aliquotacofins: numeric({ precision: 5, scale: 2 }),
		aliquotaapis: numeric(),
		codigo: varchar({ length: 16 }),
		cst: varchar({ length: 2 }),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		descricao: varchar({ length: 100 }),
		datafinal: date(),
		datainicial: date(),
		descricaounidade: varchar({ length: 127 }),
		exipi: varchar({ length: 256 }),
		ncm: varchar({ length: 256 }),
		ncmex: varchar({ length: 256 }),
	}
)

// Cadastro de motivos de rebaixa
export const motivorebaixa = pgTable(
	"motiborebaixa",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 6 }),
		nome: varchar({ length: 50 }),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		inativo: smallint(),
	},
	(table) => [
		index("motiborebaixa_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("motiborebaixa_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
	]
)

// Ordem de serviço
export const ordemservico = pgTable(
	"ordemservico",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		agendamento: timestamp({ precision: 3, mode: "string" }), // Data de agendamento
		anofabricacao: smallint(), // Ano de fabricação do veículo
		aprovacaoorcamento: date(), // Data de aprovação da OS orçamento
		caracteristicas: varchar({ length: 50 }), // Características
		ccf: integer(), // CCF da operacao que emitiu o cupom fiscal
		cnpjcpfcliente: varchar({ length: 18 }), // CNPJ/CPF do cliente
		cnpjfilial: varchar({ length: 18 }), // CNPJ da filial
		codigo: bigint({ mode: "number" }), // Código
		compra: date(), // Data de compra
		coo: integer(), // COO da operação que emitiu o cupom fiscal
		cooger: integer(), // COO do relatorio gerencial que a Ordem de serviço foi impressa
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		data: timestamp({ precision: 3, mode: "string" }), // Data e hora
		datahoraimpressao: timestamp({ precision: 3, mode: "string" }), // Data e hora de impressao do documento
		datahoraretirada: timestamp({ precision: 3, mode: "string" }), // Data e hora de retirada do objeto
		dataos: date(), // Data
		dataultimoevento: timestamp({ precision: 3, mode: "string" }), // Data do último evento
		descontosubtotal: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total
		descricaoitem: text(), // Descrição do item
		descricaotipoultimoevento: text(), // Descrição último tipo evento
		descricaoultimoevento: text(), // Descrição último evento
		descsubtotalproduto: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total dos produtos
		descsubtotalservico: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total dos serviços
		deslocamento: varchar({ length: 50 }), // Deslocamento
		ecfmarca: varchar({ length: 20 }), // Marca da ECF
		ecfmfadicional: varchar({ length: 1 }), // Letra indicativa de MF adicional
		ecfmodelo: varchar({ length: 20 }), // Modelo da ECF
		ecfserie: varchar({ length: 20 }), // Série da ECF
		ecftipo: varchar({ length: 7 }), // Tipo da ECF
		entradaitem: timestamp({ precision: 3, mode: "string" }), // Data da entrada do item
		existeevento: smallint(), // Existe evento
		extra1: text(), // Campo Extra para informações adicionais 1
		extra2: text(), // Campo Extra para informações adicionais 2
		extra3: text(), // Campo Extra para informações adicionais 3
		extra4: text(), // Campo Extra para informações adicionais 4
		extra5: text(), // Campo Extra para informações adicionais 5
		extra6: text(), // Campo Extra para informações adicionais 6
		extra7: text(), // Campo Extra para informações adicionais 7
		extra8: text(), // Campo Extra para informações adicionais 8
		extra9: text(), // Campo Extra para informações adicionais 9
		extra10: text(), // Campo Extra para informações adicionais 10
		extra11: text(), // Campo Extra para informações adicionais 11
		extra12: text(), // Campo Extra para informações adicionais 12
		extra13: text(), // Campo Extra para informações adicionais 13
		extra14: text(), // Campo Extra para informações adicionais 14
		extra15: text(), // Campo Extra para informações adicionais 15
		extra16: text(), // Campo Extra para informações adicionais 16
		faturouparacupom: smallint(), // Indica se faturou para cupom fiscal
		faturouparanota: smallint(), // Indica se faturou para nota fiscal
		fimservico: timestamp({ precision: 3, mode: "string" }), // Data/hora do fim do serviço
		garantia: smallint(), // Identifica se o produto esta na Garantia
		geroufinanceiro: smallint(), // Identifica se gerou financeiro
		hash: bigint({ mode: "number" }), // Hash de controle de alteração do registro
		hashpafnfce: bigint({ mode: "number" }), // Hash de controle de alteração do registro do PAF-NFC-e
		idarea: text(), // ID da área
		idatendente: text(), // ID do atendente
		idcliente: text(), // ID do cliente
		idcondicaopagamento: text(), // Condição de pagamento
		iddavos: text(), // Dav-OS
		iddocumentofiscal: text(), // ID do documento fiscal
		idfilial: text(), // ID da filial
		idobjeto: text(), // ID do objeto a ser consertado
		idorcamentofaturamento: text(), // ID do orçamento de faturamento
		idosmesclada: text(), // ID da OS que foi gerada atraves da mesclagem
		idosorigem: text(), // ID da OS que quue foi duplicada
		idprioridade: text(), // ID da prioridade
		idproduto: text(), // ID do produto
		idrepresentante2: text(), // ID do segundo comissionado
		idtipodocumentofinanceiro: text(), // ID do tipo de documento financeiro
		idtipoproblema: text(), // ID do tipo de problema
		idultimotecnico: text(), // ID do último ténico
		idusuario: text(), // ID do usuário que cadastrou a O.S.
		idusuarioaprovacaoorcamento: text(), // ID do usuário que aprovou o orçamento
		idusuarioentrega: text(), // ID do usuário que executou a retirada
		idusuarioliberouatraso: text(), // ID do usuário que liberou venda para cliente com atrasos
		idusuarioliberoulimite: text(), // ID do usuário que liberou venda acima do limite de crédito
		impresso: smallint(), // Impresso
		inicioservico: timestamp({ precision: 3, mode: "string" }), // Data/hora do início do serviço
		laudotecnico: text(), // Laudo Técnico
		localatendimento: smallint(), // Local de atendimento
		marca: varchar({ length: 30 }), // Marca do veiculo
		modelo: varchar({ length: 30 }), // Modelo do veículo
		nomecliente: varchar({ length: 60 }), // Nome do cliente
		nomeresponsavelretirada: text(), // Nome do responsável que fez a retirada
		numerofabricacao: varchar({ length: 30 }), // Número de fabricação
		numeronotafiscal: varchar({ length: 20 }), // Número da nota fiscal de compra
		observacao: text(), // Observações
		observacaogarantia: text(), // Observações da garantia
		orcamento: smallint(), // Indica se a OS foi gravada como orçamento
		orcamentoaprovado: smallint(), // Indica se a OS orçamento foi aprovada
		pautapreco: smallint(), // Pauta de preço utilizada na venda
		pdv: smallint(), // Número do pdv que emitiu o cupom fiscal
		percdescsubtotalproduto: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal dos produtos
		percdescsubtotalservico: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal dos serviços
		percentualdescontosubtotal: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal
		placa: varchar({ length: 10 }), // Placa do veículo
		previsaoconclusao: date(), // Previsão de conclusão
		problemadescrito: text(), // Problema descrito
		renavam: varchar({ length: 11 }), // Renavam do veículo
		saidaitem: timestamp({ precision: 3, mode: "string" }), // Data da saída do item
		servicoexecutado: text(), // Serviço(s) executado(s)
		serviconaoexecutado: text(), // Serviço(s) não executado(s)
		status: smallint(), // Status da ordem de serviço
		tipogarantia: smallint(), // Tipo de garantia
		titulodav: varchar({ length: 30 }), // Titulo do dav
		validadegarantia: date(), // Data de validade da garantia
		validadeorcamento: date(), // Data de validade da OS orçamento
		valor: numeric({ precision: 12, scale: 2 }), // Valor
		valorbrinde: numeric({ precision: 12, scale: 2 }), // Valor Total Brinde
		valorprodutos: numeric({ precision: 12, scale: 2 }), // Valor dos produtos
		valorservicos: numeric({ precision: 12, scale: 2 }), // Valor dos serviços
	},
	(table) => [
		index("ordemservico_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservico_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("int8_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservico_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcliente],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_entidade",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante2],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_representante2",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idatendente],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_atendente",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idultimotecnico],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_ultimo_tecnico",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "fk_ordemservico_produto",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_ordemservico_tipodocfin",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idosmesclada],
			foreignColumns: [table.id],
			name: "fk_ordemservico_osmesclada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idosorigem],
			foreignColumns: [table.id],
			name: "fk_ordemservico_osorigem",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuario_cad",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioaprovacaoorcamento],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuaprovorc",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioentrega],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

// Cadastro de áreas
export const area = pgTable(
	"area",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		descricao: varchar({ length: 50 }),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("area_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "area_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
)

// Cadastro de Prioridades
export const prioridades = pgTable(
	"prioridades",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		peso: smallint(),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		descricao: varchar({ length: 50 }),
		codigo: varchar({ length: 6 }),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("prioridades_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "prioridades_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
)

// Cadastros de tipo de problema
export const tipoproblema = pgTable(
	"tipoproblema",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 6 }),
		descricao: varchar({ length: 50 }),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("tipoproblema_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "tipoproblema_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
)

// Objetos de conserto de ordem de serviço
export const objeto = pgTable(
	"objeto",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 20 }),
		anofabricacao: smallint(),
		campochave: varchar({ length: 50 }),
		descricao: varchar({ length: 100 }),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		marca: varchar({ length: 30 }),
		modelo: varchar({ length: 30 }),
		numerofabricacao: varchar({ length: 30 }),
		placa: varchar({ length: 10 }),
		renavam: varchar({ length: 11 }),
		identidade: text(),
		extra1: text(),
		extra2: text(),
		extra3: text(),
		extra4: text(),
		extra5: text(),
		extra6: text(),
		extra7: text(),
		extra8: text(),
		extra9: text(),
		extra10: text(),
	},
	(table) => [
		index("objeto_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "objeto_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "objeto_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	]
)

// Cadastro de condições de pagamento
export const condicaopagamento = pgTable(
	"condicaopagamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 10 }),
		descricao: varchar({ length: 512 }),
		dialimite: smallint(),
		diavencimento: smallint(),
		dodispositivo: smallint(),
		escopo: smallint(), // 0=Compra e venda, 1=Vendas e 2=Compras
		fator: numeric(),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		mesescarencia: smallint(),
		naoutilizarnopdv: smallint(),
		parcelas: smallint(),
		percentual: numeric(),
		podeserflex: smallint(),
		prazomanipulacao: smallint(),
		prazomedio: smallint(),
		prazos: varchar({ length: 512 }),
		tipo: smallint(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("condicaopagamento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "condicaopagamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	]
)

// Lançamento de DAV e Pré-Vendas
export const dav = pgTable(
	"dav",
	{
		id: text().primaryKey().notNull(), // Chave primaria
		idempresa: text().notNull(), // ID da empresa
		acrescimo: numeric({ precision: 12, scale: 2 }), // Valor do acrescimo
		agenciabancocheque: varchar({ length: 10 }), // Agencia do banco do cheque a vista
		anofabricacao: smallint(), // Ano de fabricação do veículo
		aprazo: numeric({ precision: 12, scale: 2 }), // Valor pago a prazo
		aprovado: smallint(), // Identifica se o orçamento foi Aprovado
		assinatura: text(), // Assinatura do pedido
		avista: numeric({ precision: 12, scale: 2 }), // Valor pago a vista
		bairroentrega: varchar({ length: 50 }), // Bairro de entrega
		baseicms: numeric({ precision: 12, scale: 2 }), // Base de cálculo do icms
		baseicmssubstituicao: numeric({ precision: 12, scale: 2 }), // Base de cálculo do icms substituição tributária
		carteiradigital: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		ccf: integer(), // CCF do cupom fiscal onde o dav foi utilizado
		celularentrega: varchar({ length: 40 }), // Número do celular para entrega
		cepentrega: varchar({ length: 9 }), // CEP de entrega
		cheque: numeric({ precision: 12, scale: 2 }), // Valor pago em cheque
		cnpjcpfcliente: varchar({ length: 18 }), // CNPJ/CPF do cliente
		cnpjcpfentrega: varchar({ length: 20 }), // CNPJ/CPF da entrega
		cnpjcpftransportadora: varchar({ length: 18 }), // CNPJ ou CPF da transportadora
		cnpjfilial: varchar({ length: 18 }), // CNPJ da filial
		codigo: bigint({ mode: "number" }), // Código
		codigoecommerce: varchar({ length: 50 }), // Código da DAV (Pedido) no ECommerce
		codigomobile: varchar({ length: 36 }), // Código da DAV (Pedido) no Mobile
		codigoorigemecommerce: varchar({ length: 50 }), // Código Origem no ECommerce
		codigorastreio: varchar({ length: 200 }), // Código do rastreamento
		codigotabelafinanciamento: varchar({ length: 10 }), // Código da tabela de financiamento
		cofins: numeric({ precision: 12, scale: 2 }), // Valor do COFINS
		comissaorepresentante: numeric({ precision: 12, scale: 2 }), // Valor da comissão do representante
		complementoentrega: varchar({ length: 60 }), // Complemento do endereço da entrega
		conferido: smallint(), // Identifica se foi conferido
		coo: integer(), // COO do cupom fiscal onde o dav foi utilizado
		cooger: integer(), // COO do relatório gerencial
		cpfcnpjemitentecheque: varchar({ length: 20 }), // CPF/CNPJ do emitente do cheque a vista
		cupomemitido: smallint(), // DAV possui cupom fiscal emitido: 0=Não 1=Sim
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		data: date(), // Data emissão
		dataalteracao: timestamp({ precision: 3, mode: "string" }), // Data alteração
		datacancelamento: date(), // Data do cancelamento
		datahoradespacho: timestamp({ precision: 3, mode: "string" }), // Data e hora do despacho
		datahorafaturamento: timestamp({ precision: 3, mode: "string" }), // Data e hora do faturamento
		datahoraimpressao: timestamp({ precision: 3, mode: "string" }), // Data e hora da impressão
		datahorarecebimento: timestamp({ precision: 3, mode: "string" }), // Data e hora do recebimento
		dataimportacao: date(), // Data de importação
		datainclusao: timestamp({ precision: 3, mode: "string" }), // Data inclusão
		datapedidomobile: timestamp({ precision: 3, mode: "string" }), // Data e hora do pedido no mobile
		dataprimeirovencimento: date(), // Data para o primeiro vencimento
		deposito: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		desconto: numeric({ precision: 12, scale: 2 }), // Valor do desconto total dos produtos
		descontosubtotal: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total da DAV
		despachomelhorenvio: smallint(), // Despacho realizado no Melhor Envio
		devolucao: numeric({ precision: 12, scale: 2 }), // Valor pago em devoluções
		diferencafianciamento: numeric({ precision: 12, scale: 2 }), // Valor de diferença do financiamento
		dinheiro: numeric({ precision: 12, scale: 2 }), // Valor pago em dinheiro
		ecfmarca: varchar({ length: 20 }), // Marca do ECF
		ecfmfadicional: varchar({ length: 1 }), // Letra indicativa de MF adicional
		ecfmodelo: varchar({ length: 20 }), // Modelo do ECF
		ecfserie: varchar({ length: 20 }), // Número de série do ECF
		ecftipo: varchar({ length: 7 }), // Tipo do ECF
		emailentrega: varchar({ length: 60 }), // E-mail
		enderecoentrega: varchar({ length: 60 }), // Endereço de entrega
		enderecotransportadora: varchar({ length: 50 }), // Endereço da transportadora
		entrega: timestamp({ precision: 3, mode: "string" }), // Data da entrega da(s) mercadoria(s)
		especietransportadora: varchar({ length: 60 }), // Espécie da mercadoria transportadora
		extra1: varchar({ length: 512 }), // Campo extra 1 (campo utilizado para guardar uma informação qualquer)
		extra2: varchar({ length: 512 }), // Campo extra 2 (campo utilizado para guardar uma informação qualquer)
		extra3: varchar({ length: 512 }), // Campo extra 3 (campo utilizado para guardar uma informação qualquer)
		extra4: varchar({ length: 512 }), // Campo extra 4 (campo utilizado para guardar uma informação qualquer)
		extra5: varchar({ length: 512 }), // Campo extra 5 (campo utilizado para guardar uma informação qualquer)
		extra6: varchar({ length: 512 }), // Campo extra 6 (campo utilizado para guardar uma informação qualquer)
		extra7: varchar({ length: 512 }), // Campo extra 7 (campo utilizado para guardar uma informação qualquer)
		extra8: varchar({ length: 512 }), // Campo extra 8 (campo utilizado para guardar uma informação qualquer)
		extra9: varchar({ length: 512 }), // Campo extra 9 (campo utilizado para guardar uma informação qualquer)
		extra10: varchar({ length: 512 }), // Campo extra 10 (campo utilizado para guardar uma informação qualquer)
		hash: bigint({ mode: "number" }), // Hash para controle de alteração
		hashpafnfce: bigint({ mode: "number" }), // Hash para controle de alteração do PAF-NFC-e
		icms: numeric({ precision: 12, scale: 2 }), // Valor do icms
		icmsfundopobrezainterno: numeric({ precision: 12, scale: 2 }), // Valor do ICMS relativo ao Fundo de Combate à Pobreza (FCP) interno
		icmsfundopobrezast: numeric({ precision: 12, scale: 2 }), // Valor do ICMS relativo ao Fundo de Combate à Pobreza (FCP) ST
		icmssubstituicao: numeric({ precision: 12, scale: 2 }), // Valor do icms substituição tributária
		idadiantamento: text(), // ID do adiantamento do cliente
		idadmcarteiradigital: text(), // Carteira digital
		idbancocheque: text(), // Banco do cheque a vista
		idcarrinhocompras: text(), // ID do carrinho de compras
		idcfop: text(), // ID da natureza de operação
		idcidadeentrega: text(), // ID da cidade de entrega
		idcidadetransportadora: text(), // id da cidade da transortadora
		idcliente: text(), // ID do cliente
		idcondicaopagamento: text(), // ID da condição de pagamento
		idconfiguracaoecommerce: text(), // ID da Configuração do Ecommerce integração
		idcontacorrentedeposito: text(), // Conta corrente do depósito
		idcontacorrentepix: text(), // Conta corrente do PIX
		idcupomshop: text(), // ID do cupom Uniplus Shop
		iddavgerada: text(), // ID DAV que foi gerada
		iddavmesclada: text(), // ID da DAV que foi gerada atraves da mesclagem
		iddavoriginal: text(), // ID DAV original
		identidaderemessaecommerce: text(), // ID Entidade Remessa ecommerce
		identificacao: varchar({ length: 20 }), // Apelido para a pré-venda
		identregamercadolivre: text(), // ID da entrega do Mercado Livre
		idestadoentrega: text(), // ID do estado de entrega
		idestadotransportadora: text(), // Estado da transportadora
		idestadoveiculotransportadora: text(), // UF do veículo transportadora
		idfilial: text(), // ID da filial
		idfinalizador: text(), // ID do finalizador
		idformaentregaregiao: text(), // ID da forma de entrega região
		idlocalestoque: text(), // Local de estoque
		idlocalretirada: text(), // Id local de retirada
		idlocalretiradanf: text(), // Local de retirada
		idnfce: text(), // NFC-e
		idnotafiscal: text(), // ID da nota fiscal
		idnotaressaecomerce: text(), // ID Nota Remessa ECommerce
		idnotavendaecomerce: text(), // ID Nota Venda ECommerce
		idoperacao: text(), // ID da operacao
		idoperacaofiscal: text(), // ID Operação fiscal
		idrastreioecommerce: text(), // ID do rastreio no ecommerce
		idrepresentante: text(), // ID do representante responsãvel pela venda
		idrepresentante2: text(), // ID do segundo comissionado
		idroteirovendedor: text(), // ID do Roteiro do Vendedor associado a venda.
		idtabelafinanciamento: text(), // id da tabela de financiamento
		idtabelafinanciamentoparcela: text(), // id da tabela de parcelas do financiamento
		idtabelafinanparcelacond: text(), // id da tabela de parcelas do financiamento por condição de pagamento
		idtabelapreco: text(), // ID da tabela de preços
		idtipodocumentofinanceiro: text(), // ID do tipo de documento financeiro
		idtipopedido: text(), // ID Tipo de pedido
		idtransacaofinanceira: text(), // Transação financeira
		idtransportadora: text(), // ID da transportadora
		idtranspremessaecommerce: text(), // ID Entidade Transportadora ECommerce
		idusuario: text(), // ID do usuário que realizou a venda
		idusuariocancelamento: text(), // ID do usuário que cancelou
		idusuarioconferencia: text(), // Usuário que conferiu o pedido
		idusuariodescontofin: text(), // ID do usuário que deu desconto no financiamento.
		idusuariofaturamento: text(), // ID do usuário que faturou
		idusuarioliberouatraso: text(), // ID do usuário que liberou venda para cliente com atrasos
		idusuarioliberoulimite: text(), // ID do usuário que liberou venda acima do limite de crédito
		ietransportadora: varchar({ length: 20 }), // Inscrição estadual da transportadora
		impresso: smallint(), // Identifica se a DAV foi impressa
		incluidoporcliente: smallint(), // Foi cadastrado pelo cliente
		inscricaoestadual: varchar({ length: 20 }), // Inscrição estadual
		ipi: numeric({ precision: 12, scale: 2 }), // Valor do IPI
		latitudeentrega: numeric({ precision: 10, scale: 7 }), // Latitude
		longitudeentrega: numeric({ precision: 10, scale: 7 }), // Longitude
		marca: varchar({ length: 30 }), // Marca do veiculo
		marcatransportadora: varchar({ length: 60 }), // Marca da mercadoria transportadora
		modelo: varchar({ length: 30 }), // Modelo do veículo
		nomecliente: varchar({ length: 60 }), // Nome do cliente
		nomeemitentecheque: varchar({ length: 60 }), // Nome do emitente do cheque a vista
		nomerazaosocialentrega: varchar({ length: 50 }), // Nome/Razão social da entrega
		numerocheque: varchar({ length: 20 }), // Número do cheque a vista
		numerocontacorrentebancocheque: varchar({ length: 10 }), // Conta corrente do cheque a vista
		numeroenderecoentrega: varchar({ length: 6 }), // Número do endereço de entrada
		numeroenderecotransportadora: varchar({ length: 6 }), // Número do endereço transportadora
		numeroparcelas: smallint(), // Número de parcelas
		numeroserie: varchar({ length: 30 }), // Número de série
		numerotransportadora: varchar({ length: 60 }), // Número do roda pé da NF transportadora
		objnotaecommerce: text(), // Joson Nota EComerce
		observacao: text(), // Observação
		outros: numeric({ precision: 12, scale: 2 }), // Valor pago em outros valores
		pautapreco: smallint(), // Pauta de preço utilizada na venda
		pdv: smallint(), // Número do ECF onde a dav foi utilizado
		pedidocliente: varchar({ length: 50 }), // Pedido do representante
		pedidoclientexped: varchar({ length: 60 }), // Pedido do cliente (xPed)
		pedidoreferenteadiantamento: smallint(), // Indica se o pedido é referente a um adiantamento do cliente
		percentualdescontosubtotal: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal
		pesobrutotransportadora: numeric({ precision: 12, scale: 3 }), // Peso bruto da mercadoria transportadora
		pesoliquidotransportadora: numeric({ precision: 12, scale: 3 }), // Peso liquido da mercadoria transportadora
		pis: numeric({ precision: 12, scale: 2 }), // Valor do PIS
		pix: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		placa: varchar({ length: 10 }), // Placa do veículo
		placaveiculotransportadora: varchar({ length: 8 }), // Placa do veículo transportadora
		plano: varchar({ length: 255 }), // Plano
		posaprazo: numeric({ precision: 12, scale: 2 }), // Valor do pagamento em POS à prazo
		posavista: numeric({ precision: 12, scale: 2 }), // Valor do pagamento em POS à vista
		quantidadetransportadora: numeric({ precision: 15, scale: 6 }), // Quantidade transportadora
		renavam: varchar({ length: 11 }), // Renavam do veículo
		status: smallint(), // Status 0=Aberto; 1=Fechado; 2=Passou pelo caixa; 3=Cancelado; 4=Nota fiscal gerada
		statusecommerce: varchar({ length: 50 }), // Status da DAV (Pedido) no ECommerce
		taxa: numeric({ precision: 12, scale: 2 }), // Taxa
		telefoneentrega: varchar({ length: 40 }), // Número do telefone para entrega
		temfinanciamento: smallint(), // Indicador se o dav tem financiamento
		tipocompra: smallint(), // Tipo da compra
		tipodocumento: smallint(), // Tipo de documento 1=Pré-venda; 2=Orçamento; 4=Pedido
		tipofrete: smallint(), // Tipo de frete
		tipoparcela: smallint(), // Tipo de parcela
		tipopedidoecommerce: varchar({ length: 50 }), // Tipo pedido ECommerce
		tipopessoa: smallint(), // Tipo de pessoa 0=Física; 1=Jurídica
		tipopessoaentrega: smallint(), // Tipo pessoa da entrega
		tipovenda: smallint(), // Tipo de venda
		titulodav: varchar({ length: 30 }), // Titulo do dav
		trocoshop: numeric({ precision: 12, scale: 2 }), // Troco Shop
		urlrastreio: varchar({ length: 200 }), // URL de rastreio
		validade: date(), // Data de validade
		valor: numeric({ precision: 12, scale: 2 }), // Valor do documento
		valoracrescimo: numeric({ precision: 12, scale: 2 }), // Valor do acréscimo
		valordesconto: numeric({ precision: 12, scale: 2 }), // Valor do desconto
		valordescontousuario: numeric({ precision: 12, scale: 2 }), // Valor do desconto do usuário
		valorentrada: numeric({ precision: 12, scale: 2 }), // Valor de entrada
		valorentradaoriginal: numeric({ precision: 12, scale: 2 }), // Valor de entrada
		valorfrete: numeric({ precision: 12, scale: 2 }), // Valor do frete
		valorprestacao: numeric({ precision: 12, scale: 2 }), // Valor da prestação
		valorprestacaooriginal: numeric({ precision: 12, scale: 2 }), // Valor da prestação original
		valortotalfinanceiro: numeric({ precision: 12, scale: 2 }), // Valor total do financeiro
		valortotalparcelas: numeric({ precision: 12, scale: 2 }), // Valor total das parcelas
		valortotalparcelasoriginal: numeric({ precision: 12, scale: 2 }), // Valor total das parcelas
		vencimentocheque: date(), // Vencimento do cheque a vista
	},
	(table) => [
		index("dav_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("dav_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("int8_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "dav_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcliente],
			foreignColumns: [entidade.id],
			name: "fk_dav_cliente",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante],
			foreignColumns: [entidade.id],
			name: "fk_dav_representante",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante2],
			foreignColumns: [entidade.id],
			name: "fk_dav_representante2",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtransportadora],
			foreignColumns: [entidade.id],
			name: "fk_dav_transp",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.identidaderemessaecommerce],
			foreignColumns: [entidade.id],
			name: "fk_dav_entremessaecommerce",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcondicaopagamento],
			foreignColumns: [condicaopagamento.id],
			name: "fk_dav_condicaopagamento",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_dav_tipodocumentofinanceiro",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfop],
			foreignColumns: [cfop.id],
			name: "fk_dav_cfop",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrentedeposito],
			foreignColumns: [contacorrente.id],
			name: "fk_dav_contadeposito",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrentepix],
			foreignColumns: [contacorrente.id],
			name: "fk_dav_contapix",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavgerada],
			foreignColumns: [table.id],
			name: "fk_dav_davgerada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavmesclada],
			foreignColumns: [table.id],
			name: "fk_dav_davmesclada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavoriginal],
			foreignColumns: [table.id],
			name: "fk_dav_davoriginal",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariofaturamento],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuariofaturamento",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariodescontofin],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario_desc_fin",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariocancelamento],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario_cancel",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioconferencia],
			foreignColumns: [usuarios.id],
			name: "fk_dav_idusuarioconferencia",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

// Tabela cadastro de local de retirada
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
	]
)
