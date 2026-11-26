import { astVisitor, parse, type Statement } from "pgsql-ast-parser";

const TAMANHO_MAXIMO_SQL = 20_000;

const FUNCOES_BLOQUEADAS = new Set([
	"pg_sleep",
	"pg_read_file",
	"pg_read_binary_file",
	"pg_ls_dir",
	"pg_stat_file",
	"lo_import",
	"lo_export",
	"lo_get",
	"lo_put",
	"dblink",
	"dblink_exec",
	"dblink_connect",
	"set_config",
	"current_setting",
	"pg_terminate_backend",
	"pg_cancel_backend",
	"pg_reload_conf",
	"query_to_xml",
	"inet_server_addr",
	"inet_client_addr",
	"version",
]);

export class ErroValidacaoSqlBi extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErroValidacaoSqlBi";
	}
}

export type ResultadoValidacaoSqlBi = {
	sqlOriginal: string;
	sqlParametrizado: string;
	parametrosDetectados: string[];
	valores: unknown[];
};

function isIdentStart(ch: string): boolean {
	return /[a-zA-Z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
	return /[a-zA-Z0-9_]/.test(ch);
}

/**
 * Converte placeholders nomeados (`:data_inicio`, `:data_fim`) fora de strings,
 * identificadores com aspas e comentários em parâmetros posicionais (`$1`, `$2`).
 * Ignora casts PostgreSQL (`::date`, `::numeric`).
 */
export function extrairESubstituirParametros(
	sqlBruto: string,
	parametros?: Record<string, unknown>,
): {
	sqlParametrizado: string;
	parametrosDetectados: string[];
	valores: unknown[];
} {
	const indicePorNome = new Map<string, number>();
	const parametrosDetectados: string[] = [];
	let out = "";
	let i = 0;
	const len = sqlBruto.length;

	while (i < len) {
		const ch = sqlBruto[i] ?? "";
		const next = sqlBruto[i + 1] ?? "";

		// Comentário de linha --
		if (ch === "-" && next === "-") {
			const fimLinha = sqlBruto.indexOf("\n", i);
			if (fimLinha === -1) {
				out += sqlBruto.slice(i);
				break;
			}
			out += sqlBruto.slice(i, fimLinha + 1);
			i = fimLinha + 1;
			continue;
		}

		// Comentário de bloco /* ... */
		if (ch === "/" && next === "*") {
			const fimBloco = sqlBruto.indexOf("*/", i + 2);
			if (fimBloco === -1) {
				throw new ErroValidacaoSqlBi("Comentário de bloco SQL não fechado.");
			}
			out += sqlBruto.slice(i, fimBloco + 2);
			i = fimBloco + 2;
			continue;
		}

		// String literal '...'
		if (ch === "'") {
			let j = i + 1;
			while (j < len) {
				if (sqlBruto[j] === "'") {
					if (sqlBruto[j + 1] === "'") {
						j += 2;
						continue;
					}
					j += 1;
					break;
				}
				j += 1;
			}
			out += sqlBruto.slice(i, j);
			i = j;
			continue;
		}

		// Identificador "..."
		if (ch === '"') {
			let j = i + 1;
			while (j < len) {
				if (sqlBruto[j] === '"') {
					if (sqlBruto[j + 1] === '"') {
						j += 2;
						continue;
					}
					j += 1;
					break;
				}
				j += 1;
			}
			out += sqlBruto.slice(i, j);
			i = j;
			continue;
		}

		// Cast ::tipo (não é parâmetro)
		if (ch === ":" && next === ":") {
			out += "::";
			i += 2;
			continue;
		}

		// Parâmetro nomeado :nome
		if (ch === ":" && isIdentStart(next)) {
			const anterior = i > 0 ? (sqlBruto[i - 1] ?? "") : "";
			if (anterior === ":") {
				out += ch;
				i += 1;
				continue;
			}
			let j = i + 1;
			while (j < len && isIdentPart(sqlBruto[j] ?? "")) {
				j += 1;
			}
			const nome = sqlBruto.slice(i + 1, j);
			let idx = indicePorNome.get(nome);
			if (!idx) {
				parametrosDetectados.push(nome);
				idx = parametrosDetectados.length;
				indicePorNome.set(nome, idx);
			}
			out += `$${idx}`;
			i = j;
			continue;
		}

		out += ch;
		i += 1;
	}

	const hoje = new Date();
	const trintaDiasAtras = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);
	const formatarIso = (d: Date) => d.toISOString().slice(0, 10);

	const valores = parametrosDetectados.map((nome) => {
		const informado = parametros?.[nome];
		if (informado !== undefined && informado !== null && informado !== "") {
			return informado;
		}
		if (nome === "data_inicio") return formatarIso(trintaDiasAtras);
		if (nome === "data_fim") return formatarIso(hoje);
		throw new ErroValidacaoSqlBi(
			`Parâmetro obrigatório ":${nome}" não foi informado.`,
		);
	});

	return {
		sqlParametrizado: out,
		parametrosDetectados,
		valores,
	};
}

function validarStatementSomenteLeitura(stmt: Statement): void {
	if (stmt.type === "select") {
		if ("into" in stmt && stmt.into) {
			throw new ErroValidacaoSqlBi(
				"Cláusula SELECT INTO não é permitida no Editor SQL.",
			);
		}
		if ("for" in stmt && stmt.for) {
			throw new ErroValidacaoSqlBi(
				"Cláusulas de lock (FOR UPDATE/SHARE) não são permitidas.",
			);
		}
		return;
	}

	if (stmt.type === "union") {
		validarStatementSomenteLeitura(stmt.left);
		validarStatementSomenteLeitura(stmt.right);
		return;
	}

	if (stmt.type === "with") {
		for (const cte of stmt.bind) {
			validarStatementSomenteLeitura(cte.statement);
		}
		validarStatementSomenteLeitura(stmt.in);
		return;
	}

	throw new ErroValidacaoSqlBi(
		`Comando "${stmt.type.toUpperCase()}" não permitido. Apenas consultas SELECT/WITH são aceitas.`,
	);
}

/**
 * Valida uma consulta SQL do BI garantindo:
 * 1. Exatamente 1 statement SELECT/WITH (sem DML/DDL ou múltiplos comandos)
 * 2. Acesso restrito ao schema `relatorios` (views curadas multi-tenant)
 * 3. Bloqueio de funções administrativas/sensíveis do PostgreSQL
 * 4. Parametrização segura de `:parametros` para `$1`, `$2`
 */
export function validarEPrepararSqlBi(
	sqlInput: string,
	parametros?: Record<string, unknown>,
): ResultadoValidacaoSqlBi {
	const limpo = sqlInput.trim().replace(/;+\s*$/, "").trim();
	if (!limpo) {
		throw new ErroValidacaoSqlBi("Informe uma consulta SQL para executar.");
	}
	if (limpo.length > TAMANHO_MAXIMO_SQL) {
		throw new ErroValidacaoSqlBi(
			`A consulta excede o limite máximo de ${TAMANHO_MAXIMO_SQL} caracteres.`,
		);
	}

	const { sqlParametrizado, parametrosDetectados, valores } =
		extrairESubstituirParametros(limpo, parametros);

	let ast: Statement[];
	try {
		ast = parse(sqlParametrizado);
	} catch (erro) {
		const msg = erro instanceof Error ? erro.message : "Erro de sintaxe SQL";
		throw new ErroValidacaoSqlBi(`Erro de sintaxe SQL: ${msg}`);
	}

	if (ast.length !== 1 || !ast[0]) {
		throw new ErroValidacaoSqlBi(
			"Apenas uma única instrução SELECT é permitida por execução.",
		);
	}

	validarStatementSomenteLeitura(ast[0]);

	const erros: string[] = [];
	const visitor = astVisitor((map) => ({
		tableRef: (t) => {
			const schema = t.schema?.toLowerCase();
			const nome = t.name?.toLowerCase() ?? "";
			if (schema && schema !== "relatorios") {
				erros.push(
					`Acesso ao schema "${t.schema}" não é permitido. Utilize apenas views do schema "relatorios".`,
				);
			}
			if (nome.startsWith("pg_")) {
				erros.push(`Acesso à tabela de sistema "${t.name}" não é permitido.`);
			}
		},
		call: (c) => {
			const fnSchema = c.function.schema?.toLowerCase();
			const fnName = c.function.name?.toLowerCase() ?? "";
			if (fnSchema && fnSchema !== "pg_catalog") {
				erros.push(
					`Chamada de função no schema "${c.function.schema}" não é permitida.`,
				);
			}
			if (FUNCOES_BLOQUEADAS.has(fnName)) {
				erros.push(`A função "${c.function.name}" não é permitida no Editor SQL.`);
			}
			map.super().call(c);
		},
		statement: (s) => {
			if (s.type !== "select" && s.type !== "union" && s.type !== "with") {
				erros.push(`Instrução "${s.type.toUpperCase()}" não é permitida.`);
			}
			map.super().statement(s);
		},
	}));

	visitor.statement(ast[0]);

	if (erros.length > 0) {
		throw new ErroValidacaoSqlBi(erros[0]!);
	}

	return {
		sqlOriginal: limpo,
		sqlParametrizado,
		parametrosDetectados,
		valores,
	};
}
