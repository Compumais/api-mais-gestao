import z from "zod";

export type MappedHttpError = {
	status: number;
	error: string;
	code: string;
	details?: unknown;
	hint?: string;
};

const CAMPOS_PT: Record<string, string> = {
	id: "ID do produto",
	idempresa: "empresa",
	dataInicio: "data inicial",
	dataFim: "data final",
	granularidade: "granularidade",
	tipoEstoque: "tipo de estoque",
	codigo: "código",
	nome: "nome",
	idunidademedida: "unidade de medida",
	idgrupo: "grupo",
	idmarca: "marca",
	idgrupogourmet: "grupo gourmet",
	idprodutopai: "produto pai",
	preco: "preço",
	ncm: "NCM",
	ippt: "IPPT",
	origem: "origem",
	ean: "EAN",
	tipo: "tipo",
};

function rotuloCampo(path: PropertyKey[]): string {
	const chave = String(path[0] ?? "");
	if (!chave) return "requisição";
	return CAMPOS_PT[chave] ?? chave;
}

function mensagemSeguraPg(message: string): string {
	const semConn = message
		.replace(/password=[^\s]+/gi, "password=***")
		.replace(/postgres:\/\/[^\s]+/gi, "postgres://***");
	const coluna = semConn.match(/column "([^"]+)"/i)?.[1];
	const tabela = semConn.match(/relation "([^"]+)"/i)?.[1];
	const constraint = semConn.match(/constraint "([^"]+)"/i)?.[1];
	if (coluna) return `Coluna ausente ou inválida: ${coluna}`;
	if (tabela) return `Tabela ausente ou inválida: ${tabela}`;
	if (constraint) return `Restrição violada: ${constraint}`;
	const curta = semConn.split("\n")[0]?.trim() ?? "";
	return curta.slice(0, 180) || "Falha no banco de dados";
}

function extrairPg(error: unknown): {
	code: string;
	message: string;
	detail?: string;
	column?: string;
	table?: string;
	constraint?: string;
} | null {
	if (!error || typeof error !== "object") return null;

	const direto =
		"code" in error && typeof (error as { code: unknown }).code === "string"
			? (error as {
					code: string;
					message?: unknown;
					detail?: unknown;
					column?: unknown;
					table?: unknown;
					constraint?: unknown;
				})
			: null;

	const cause =
		"cause" in error &&
		error.cause &&
		typeof error.cause === "object" &&
		"code" in error.cause
			? (error.cause as {
					code: unknown;
					message?: unknown;
					detail?: unknown;
					column?: unknown;
					table?: unknown;
					constraint?: unknown;
				})
			: null;

	const fonte = direto?.code ? direto : cause?.code ? cause : null;
	if (!fonte) return null;

	return {
		code: String(fonte.code),
		message: fonte.message != null ? String(fonte.message) : "",
		detail: fonte.detail != null ? String(fonte.detail) : undefined,
		column: fonte.column != null ? String(fonte.column) : undefined,
		table: fonte.table != null ? String(fonte.table) : undefined,
		constraint:
			fonte.constraint != null ? String(fonte.constraint) : undefined,
	};
}

export function formatarDetalhesZod(error: z.ZodError): {
	error: string;
	details: Array<{ path: string; message: string; campo: string }>;
} {
	const details = error.issues.map((issue) => {
		const path = issue.path.map(String).join(".") || "(raiz)";
		return {
			path,
			campo: rotuloCampo(issue.path),
			message: issue.message,
		};
	});
	const primeiro = details[0];
	const errorMsg = primeiro
		? `Campo inválido (${primeiro.campo}): ${primeiro.message}`
		: "Erro de validação";
	return { error: errorMsg, details };
}

/**
 * Mapeia Zod / Postgres / erros genéricos para resposta HTTP legível (sem stack).
 */
export function mapErrorToHttpResponse(
	error: unknown,
	contexto = "operação",
): MappedHttpError {
	if (error instanceof z.ZodError) {
		const formatado = formatarDetalhesZod(error);
		return {
			status: 400,
			error: formatado.error,
			code: "VALIDATION_ERROR",
			details: formatado.details,
		};
	}

	const pg = extrairPg(error);
	if (pg) {
		if (pg.code === "23503") {
			return {
				status: 400,
				error: `Referência inválida na ${contexto} (grupo, unidade, CFOP, CEST, marca ou produto pai).`,
				code: "FOREIGN_KEY_VIOLATION",
				hint: pg.constraint
					? `Constraint: ${pg.constraint}`
					: pg.detail
						? mensagemSeguraPg(pg.detail)
						: undefined,
			};
		}
		if (pg.code === "23505") {
			return {
				status: 409,
				error: `Já existe um registro com esses dados na ${contexto}.`,
				code: "UNIQUE_VIOLATION",
				hint: pg.constraint ? `Constraint: ${pg.constraint}` : undefined,
			};
		}
		if (pg.code === "23502") {
			return {
				status: 400,
				error: pg.column
					? `Campo obrigatório ausente: ${pg.column}.`
					: `Campo obrigatório ausente ao gravar na ${contexto}.`,
				code: "NOT_NULL_VIOLATION",
				hint: pg.column ? `Coluna: ${pg.column}` : undefined,
			};
		}
		if (pg.code === "42703") {
			return {
				status: 500,
				error:
					"Banco desatualizado (coluna ausente). Execute as migrations pendentes.",
				code: "UNDEFINED_COLUMN",
				hint: pg.column
					? `Coluna: ${pg.column}`
					: mensagemSeguraPg(pg.message),
			};
		}
		if (pg.code === "42P01") {
			return {
				status: 500,
				error:
					"Banco desatualizado (tabela ausente). Execute as migrations pendentes.",
				code: "UNDEFINED_TABLE",
				hint: pg.table
					? `Tabela: ${pg.table}`
					: mensagemSeguraPg(pg.message),
			};
		}
		if (pg.code === "22P02") {
			return {
				status: 400,
				error: `Valor com formato inválido na ${contexto}.`,
				code: "INVALID_TEXT_REPRESENTATION",
				hint: mensagemSeguraPg(pg.message),
			};
		}
		if (/^\d{5}$/.test(pg.code) || /^[0-9A-Z]{5}$/.test(pg.code)) {
			return {
				status: 500,
				error: `Erro no banco durante a ${contexto}: ${mensagemSeguraPg(pg.message)}`,
				code: "INTERNAL_ERROR",
				hint: `PG ${pg.code}`,
			};
		}
	}

	const mensagemBruta =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";

	if (mensagemBruta.includes("idprodutopai")) {
		return {
			status: 500,
			error:
				"Coluna idprodutopai ausente. Execute a migration 0111_produto_idprodutopai.",
			code: "MISSING_IDPRODUTOPAI",
		};
	}

	if (
		mensagemBruta.includes("Response does not match the schema") ||
		mensagemBruta.includes("serialization") ||
		mensagemBruta.includes("FST_ERR_FAILED_ERROR_SERIALIZATION")
	) {
		return {
			status: 500,
			error: `Falha ao serializar a resposta da ${contexto}.`,
			code: "RESPONSE_SERIALIZATION_ERROR",
		};
	}

	return {
		status: 500,
		error: `Erro interno na ${contexto}.`,
		code: "INTERNAL_ERROR",
		hint: mensagemBruta
			? mensagemSeguraPg(mensagemBruta).slice(0, 120)
			: undefined,
	};
}

export function corpoErroHttp(mapped: MappedHttpError): Record<string, unknown> {
	return {
		error: mapped.error,
		code: mapped.code,
		...(mapped.details !== undefined ? { details: mapped.details } : {}),
		...(mapped.hint ? { hint: mapped.hint } : {}),
	};
}
