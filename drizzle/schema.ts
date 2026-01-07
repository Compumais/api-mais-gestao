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

export const verificacoes = pgTable("verificacoes", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
	createdAt: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const empresa = pgTable(
	"empresas",
	{
		id: text().primaryKey().notNull(),
		nome: text().notNull(),
		cnpj: text().notNull(),
		telefone: text().notNull(),
		proprietarioId: text().notNull(),
		criadoEm: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoEm: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("empresas_cnpj_key").using(
			"btree",
			table.cnpj.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.proprietarioId],
			foreignColumns: [usuarios.id],
			name: "empresas_proprietarioId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const usuarioEmpresa = pgTable(
	"usuario_empresas",
	{
		id: text().primaryKey().notNull(),
		userId: text().notNull(),
		empresaId: text().notNull(),
		criadoEm: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoEm: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usuarios.id],
			name: "usuario_empresas_usuarioId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.empresaId],
			foreignColumns: [empresa.id],
			name: "usuario_empresas_empresaId_fkey",
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
		recursoId: text(),
		userId: text(),
		metadados: jsonb(),
		criadoEm: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usuarios.id],
			name: "audit_logs_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const sessoes = pgTable(
	"sessoes",
	{
		id: text().primaryKey().notNull(),
		expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
		token: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
		ipAddress: text(),
		userAgent: text(),
		userId: text().notNull(),
	},
	(table) => [
		uniqueIndex("sessoes_token_key").using(
			"btree",
			table.token.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usuarios.id],
			name: "sessoes_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contas = pgTable(
	"contas",
	{
		id: text().primaryKey().notNull(),
		accountId: text().notNull(),
		providerId: text().notNull(),
		userId: text().notNull(),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: timestamp({ precision: 3, mode: "string" }),
		refreshTokenExpiresAt: timestamp({ precision: 3, mode: "string" }),
		scope: text(),
		password: text(),
		createdAt: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usuarios.id],
			name: "contas_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const usuarios = pgTable(
	"usuarios",
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		email: text().notNull(),
		emailVerified: boolean().notNull(),
		role: text().default("user").notNull(),
		createdAt: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
		image: text(),
		maxCompanies: integer(),
	},
	(table) => [
		uniqueIndex("usuarios_email_key").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
	],
);

export const cliente = pgTable(
	"clientes",
	{
		id: text().primaryKey().notNull(),
		nome: text().notNull(),
		email: text(),
		telefone: text(),
		endereco: text(),
		cidade: text(),
		estado: text(),
		cep: text(),
		pais: text(),
		empresaId: text().notNull(),
		criadoEm: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoEm: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("clients_companyId_idx").using(
			"btree",
			table.empresaId.asc().nullsLast().op("text_ops"),
		),
		index("clients_email_idx").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.empresaId],
			foreignColumns: [empresa.id],
			name: "clientes_empresaId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contacorrente = pgTable("contacorrente", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: text().primaryKey().notNull(),
	descricao: varchar({ length: 50 }),
	empresaId: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	codigo: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idbanco: bigint({ mode: "number" }),
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
	tipoidentificacaocliente: smallint(),
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
		tipo: char({ length: 1 }),
		valor: numeric({ precision: 12, scale: 2 }),
		saldoanterior: numeric({ precision: 12, scale: 2 }),
		saldoatual: numeric({ precision: 12, scale: 2 }),
		historico: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuario: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idplanocontas: bigint({ mode: "number" }),
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
		idusuarioconciliacao: bigint({ mode: "number" }),
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
		empresaId: text().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idfilial: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		identidade: bigint({ mode: "number" }),
		tipo: char({ length: 1 }),
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
		idbanco: bigint({ mode: "number" }),
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
		idusuariosupervisor: bigint({ mode: "number" }),
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
			table.idfilial.asc().nullsLast().op("int8_ops"),
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
			table.idfinanceiro.asc().nullsLast().op("int8_ops"),
		),
	],
);

export const planocontas = pgTable("planocontas", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: text().primaryKey().notNull(),
	empresaId: text().notNull(),
	codigo: varchar({ length: 30 }),
	nome: varchar({ length: 40 }),
	tipomovimento: varchar({ length: 1 }),
	inativo: smallint(),
	classe: varchar({ length: 2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	currenttimemillis: bigint({ mode: "number" }),
	centrocustoobrigatorio: smallint(),
	tipoconta: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idcontacontabilintegracao: bigint({ mode: "number" }),
	exportaparacontabilidade: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	idgrupodre: bigint({ mode: "number" }),
});
