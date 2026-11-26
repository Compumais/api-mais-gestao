import { randomUUID } from "node:crypto";
import { criarAuditoria } from "@/repositories/auditoria-repositories.js";
import {
	executarSqlBi,
	type ResultadoExecucaoSqlBi,
} from "@/repositories/editor-sql-repositories.js";
import {
	httpBadRequest,
	httpLimiteExcedido,
	httpOk,
} from "@/util/http-util.js";
import {
	ErroValidacaoSqlBi,
	validarEPrepararSqlBi,
} from "@/util/validar-sql-bi.js";

const MAX_CONCORRENCIA_POR_EMPRESA = 3;
const execucoesAtivasPorEmpresa = new Map<string, number>();

type EntradaCacheWidget = {
	expiraEm: number;
	dados: ResultadoExecucaoSqlBi;
};

const cacheWidgets = new Map<string, EntradaCacheWidget>();
const MAX_ENTRADAS_CACHE = 500;

export function limparCacheWidget(idempresa: string, widgetId?: string): void {
	const prefixo = widgetId ? `${idempresa}:${widgetId}:` : `${idempresa}:`;
	for (const chave of cacheWidgets.keys()) {
		if (chave.startsWith(prefixo)) {
			cacheWidgets.delete(chave);
		}
	}
}

export function obterDoCacheWidget(
	chave: string,
): ResultadoExecucaoSqlBi | null {
	const entrada = cacheWidgets.get(chave);
	if (!entrada) return null;
	if (Date.now() > entrada.expiraEm) {
		cacheWidgets.delete(chave);
		return null;
	}
	return entrada.dados;
}

export function salvarNoCacheWidget(
	chave: string,
	dados: ResultadoExecucaoSqlBi,
	ttlSegundos: number,
): void {
	if (cacheWidgets.size >= MAX_ENTRADAS_CACHE) {
		const primeiraChave = cacheWidgets.keys().next().value;
		if (primeiraChave) cacheWidgets.delete(primeiraChave);
	}
	cacheWidgets.set(chave, {
		dados,
		expiraEm: Date.now() + Math.max(ttlSegundos, 10) * 1000,
	});
}

function adquirirSlotConcorrencia(idempresa: string): boolean {
	const atual = execucoesAtivasPorEmpresa.get(idempresa) ?? 0;
	if (atual >= MAX_CONCORRENCIA_POR_EMPRESA) return false;
	execucoesAtivasPorEmpresa.set(idempresa, atual + 1);
	return true;
}

function liberarSlotConcorrencia(idempresa: string): void {
	const atual = execucoesAtivasPorEmpresa.get(idempresa) ?? 1;
	if (atual <= 1) execucoesAtivasPorEmpresa.delete(idempresa);
	else execucoesAtivasPorEmpresa.set(idempresa, atual - 1);
}

async function registrarAuditoriaSql(params: {
	idempresa: string;
	idusuario?: string | null;
	sql: string;
	sucesso: boolean;
	duracaoMs?: number;
	totalRetornado?: number;
	erro?: string;
	origem: "editor" | "widget";
	idrecurso?: string | null;
}) {
	try {
		await criarAuditoria({
			id: randomUUID(),
			acao: params.origem === "editor" ? "EXECUTAR_SQL_BI" : "EXECUTAR_WIDGET_BI",
			recurso: "editor_sql",
			idrecurso: params.idrecurso ?? null,
			idusuario: params.idusuario ?? null,
			idempresa: params.idempresa,
			metadados: {
				sucesso: params.sucesso,
				sql: params.sql.slice(0, 1000),
				duracaoMs: params.duracaoMs ?? null,
				totalRetornado: params.totalRetornado ?? null,
				erro: params.erro ?? null,
			},
		});
	} catch (err) {
		console.warn("[editor-sql] Falha ao registrar auditoria:", err);
	}
}

export async function executarConsultaSqlService(params: {
	idempresa: string;
	idusuario?: string | null;
	sql: string;
	parametros?: Record<string, unknown>;
	limiteLinhas?: number;
	origem?: "editor" | "widget";
	idrecurso?: string | null;
}) {
	const origem = params.origem ?? "editor";
	let validado: ReturnType<typeof validarEPrepararSqlBi>;

	try {
		validado = validarEPrepararSqlBi(params.sql, params.parametros);
	} catch (erro) {
		const msg =
			erro instanceof ErroValidacaoSqlBi
				? erro.message
				: "Consulta SQL inválida.";
		await registrarAuditoriaSql({
			idempresa: params.idempresa,
			idusuario: params.idusuario,
			sql: params.sql,
			sucesso: false,
			erro: msg,
			origem,
			idrecurso: params.idrecurso,
		});
		return httpBadRequest(msg, { code: "SQL_VALIDACAO_ERRO" });
	}

	if (!adquirirSlotConcorrencia(params.idempresa)) {
		return httpLimiteExcedido();
	}

	try {
		const resultado = await executarSqlBi({
			idempresa: params.idempresa,
			sqlParametrizado: validado.sqlParametrizado,
			valores: validado.valores,
			limiteLinhas: params.limiteLinhas ?? 500,
			timeoutMs: 5000,
		});

		await registrarAuditoriaSql({
			idempresa: params.idempresa,
			idusuario: params.idusuario,
			sql: validado.sqlOriginal,
			sucesso: true,
			duracaoMs: resultado.duracaoMs,
			totalRetornado: resultado.totalRetornado,
			origem,
			idrecurso: params.idrecurso,
		});

		return httpOk({
			...resultado,
			parametrosDetectados: validado.parametrosDetectados,
		});
	} catch (erro) {
		const pgErro = erro as { message?: string; code?: string; position?: string };
		const msg =
			pgErro.code === "57014"
				? "A consulta excedeu o tempo máximo de 5 segundos. Adicione filtros de período ou limite os dados."
				: pgErro.message || "Erro ao executar consulta SQL.";

		await registrarAuditoriaSql({
			idempresa: params.idempresa,
			idusuario: params.idusuario,
			sql: validado.sqlOriginal,
			sucesso: false,
			erro: msg,
			origem,
			idrecurso: params.idrecurso,
		});

		return httpBadRequest(msg, {
			code: pgErro.code === "57014" ? "SQL_TIMEOUT" : "SQL_EXECUCAO_ERRO",
		});
	} finally {
		liberarSlotConcorrencia(params.idempresa);
	}
}
