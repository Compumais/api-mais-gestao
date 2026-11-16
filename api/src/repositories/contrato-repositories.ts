import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { NovoContrato } from "@/model/contrato-model.js";
import { contrato, contratocobranca } from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_CONTRATOS_CAMPOS = [
	"codigo",
	"descricao",
	"situacao",
	"datainicio",
	"valor",
	"criadoem",
] as const;

export type OrdenarContratosCampo = (typeof ORDENAR_CONTRATOS_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: contrato.codigo,
	descricao: contrato.descricao,
	situacao: contrato.situacao,
	datainicio: contrato.datainicio,
	valor: contrato.valor,
	criadoem: contrato.criadoem,
} as const;

export async function criarContrato(dados: NovoContrato) {
	const [registro] = await db.insert(contrato).values(dados).returning();
	return registro;
}

export async function buscarContratoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(contrato)
		.where(eq(contrato.id, id));
	return registro;
}

export async function buscarContratoPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(contrato)
		.where(and(eq(contrato.id, id), eq(contrato.idempresa, idempresa)));
	return registro;
}

export async function atualizarContrato(
	id: string,
	dados: Partial<NovoContrato>,
) {
	const [registro] = await db
		.update(contrato)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(contrato.id, id))
		.returning();
	return registro;
}

export async function excluirContrato(id: string) {
	const [registro] = await db
		.delete(contrato)
		.where(eq(contrato.id, id))
		.returning();
	return registro;
}

export type ListarContratosParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	situacao?: string | undefined;
	identidade?: string | undefined;
	fluxofaturamento?: number | undefined;
	ordenarPor?: OrdenarContratosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarContratos({
	idempresa,
	descricao,
	codigo,
	situacao,
	identidade,
	fluxofaturamento,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 20,
}: ListarContratosParametros) {
	const where: SQL[] = [eq(contrato.idempresa, idempresa)];

	if (descricao?.trim()) {
		where.push(ilike(contrato.descricao, `%${descricao.trim()}%`));
	}
	if (codigo?.trim()) {
		where.push(ilike(contrato.codigo, `%${codigo.trim()}%`));
	}
	if (situacao?.trim()) {
		where.push(eq(contrato.situacao, situacao.trim()));
	}
	if (identidade) {
		where.push(eq(contrato.identidade, identidade));
	}
	if (fluxofaturamento != null) {
		where.push(eq(contrato.fluxofaturamento, fluxofaturamento));
	}

	const offset = (page - 1) * limit;
	const colunaOrdenacao = ordenarPor
		? COLUNAS_ORDENACAO[ordenarPor]
		: contrato.criadoem;
	const ordenacao =
		ordem === "asc" ? asc(colunaOrdenacao) : desc(colunaOrdenacao);

	const [totalCount, contratos] = await Promise.all([
		db
			.select({ value: count() })
			.from(contrato)
			.where(and(...where)),
		db
			.select()
			.from(contrato)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		contratos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarContratosAtivosPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(contrato)
		.where(
			and(eq(contrato.idempresa, idempresa), eq(contrato.situacao, "ativo")),
		)
		.orderBy(asc(contrato.descricao));
}

export async function contarCobrancasPorContrato(idcontrato: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(contratocobranca)
		.where(eq(contratocobranca.idcontrato, idcontrato));
	return resultado?.value ?? 0;
}
