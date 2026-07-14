import { and, count, desc, eq, sql } from "drizzle-orm";
import type {
	StatusImportacaoInbound,
	StatusManifestacaoInbound,
	TipoDocumentoInbound,
} from "@/model/nfe-inbound-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type NfeInboundDocumentoRow =
	typeof schema.nfeinbounddocumento.$inferSelect;
export type NovaNfeInboundDocumento =
	typeof schema.nfeinbounddocumento.$inferInsert;
export type EmpresaNfeSyncRow = typeof schema.empresanfesync.$inferSelect;

export async function buscarEmpresaNfeSync(
	idempresa: string,
): Promise<EmpresaNfeSyncRow | undefined> {
	const [registro] = await db
		.select()
		.from(schema.empresanfesync)
		.where(eq(schema.empresanfesync.idempresa, idempresa));

	return registro;
}

export async function obterOuCriarEmpresaNfeSync(
	idempresa: string,
): Promise<EmpresaNfeSyncRow> {
	const existente = await buscarEmpresaNfeSync(idempresa);
	if (existente) {
		return existente;
	}

	const [criado] = await db
		.insert(schema.empresanfesync)
		.values({
			idempresa,
			ultimonsu: "0",
		})
		.onConflictDoNothing()
		.returning();

	if (criado) {
		return criado;
	}

	const [recarregado] = await db
		.select()
		.from(schema.empresanfesync)
		.where(eq(schema.empresanfesync.idempresa, idempresa));

	if (!recarregado) {
		throw new Error("Falha ao inicializar sincronização NF-e inbound");
	}

	return recarregado;
}

export async function atualizarEmpresaNfeSync(
	idempresa: string,
	dados: Partial<{
		ultimonsu: string;
		maxnsu: string | null;
		ultimosync: string;
		proximotentativa: string | null;
		sincronizando: boolean;
		importacaoautomatica: boolean;
		tentativasbackoff: number;
	}>,
): Promise<EmpresaNfeSyncRow | undefined> {
	const [atualizado] = await db
		.update(schema.empresanfesync)
		.set(dados)
		.where(eq(schema.empresanfesync.idempresa, idempresa))
		.returning();

	return atualizado;
}

export async function tentarMarcarSincronizando(
	idempresa: string,
): Promise<boolean> {
	const resultado = await db
		.update(schema.empresanfesync)
		.set({ sincronizando: true })
		.where(
			and(
				eq(schema.empresanfesync.idempresa, idempresa),
				eq(schema.empresanfesync.sincronizando, false),
			),
		)
		.returning({ idempresa: schema.empresanfesync.idempresa });

	return resultado.length > 0;
}

export async function liberarSincronizando(idempresa: string): Promise<void> {
	await db
		.update(schema.empresanfesync)
		.set({ sincronizando: false })
		.where(eq(schema.empresanfesync.idempresa, idempresa));
}

export type UpsertNfeInboundDocumentoParametros = {
	id: string;
	idempresa: string;
	nsu: string;
	chavenfe: string;
	tipodocumento: TipoDocumentoInbound;
	cnpjemitente?: string | null;
	razaoemitente?: string | null;
	numero?: number | null;
	serie?: number | null;
	dataemissao?: string | null;
	valortotal?: string | null;
	xml?: string | null;
	statusmanifestacao?: StatusManifestacaoInbound;
	statusimportacao?: StatusImportacaoInbound;
	idrascunho?: string | null;
	atualizadoem: string;
};

export async function upsertNfeInboundDocumento(
	dados: UpsertNfeInboundDocumentoParametros,
): Promise<NfeInboundDocumentoRow> {
	const [registro] = await db
		.insert(schema.nfeinbounddocumento)
		.values({
			...dados,
			criadoem: dados.atualizadoem,
		})
		.onConflictDoUpdate({
			target: [
				schema.nfeinbounddocumento.idempresa,
				schema.nfeinbounddocumento.chavenfe,
			],
			set: {
				nsu: dados.nsu,
				tipodocumento: dados.tipodocumento,
				cnpjemitente: dados.cnpjemitente ?? null,
				razaoemitente: dados.razaoemitente ?? null,
				numero: dados.numero ?? null,
				serie: dados.serie ?? null,
				dataemissao: dados.dataemissao ?? null,
				valortotal: dados.valortotal ?? null,
				xml: dados.xml ?? null,
				statusmanifestacao: dados.statusmanifestacao,
				statusimportacao: dados.statusimportacao,
				idrascunho: dados.idrascunho ?? null,
				atualizadoem: dados.atualizadoem,
			},
		})
		.returning();

	if (!registro) {
		throw new Error("Falha ao persistir documento inbound NF-e");
	}

	return registro;
}

export async function atualizarStatusManifestacaoPorChave({
	idempresa,
	chavenfe,
	statusmanifestacao,
	atualizadoem,
}: {
	idempresa: string;
	chavenfe: string;
	statusmanifestacao: StatusManifestacaoInbound;
	atualizadoem: string;
}): Promise<NfeInboundDocumentoRow | undefined> {
	const [atualizado] = await db
		.update(schema.nfeinbounddocumento)
		.set({ statusmanifestacao, atualizadoem })
		.where(
			and(
				eq(schema.nfeinbounddocumento.idempresa, idempresa),
				eq(schema.nfeinbounddocumento.chavenfe, chavenfe),
			),
		)
		.returning();

	return atualizado;
}

export async function buscarNfeInboundDocumentoPorId(
	id: string,
): Promise<NfeInboundDocumentoRow | undefined> {
	const [documento] = await db
		.select()
		.from(schema.nfeinbounddocumento)
		.where(eq(schema.nfeinbounddocumento.id, id));

	return documento;
}

export async function buscarNfeInboundDocumentoPorChave(
	idempresa: string,
	chavenfe: string,
): Promise<NfeInboundDocumentoRow | undefined> {
	const [documento] = await db
		.select()
		.from(schema.nfeinbounddocumento)
		.where(
			and(
				eq(schema.nfeinbounddocumento.idempresa, idempresa),
				eq(schema.nfeinbounddocumento.chavenfe, chavenfe),
			),
		);

	return documento;
}

export type ListarNfeInboundDocumentosParametros = {
	idempresa: string;
	statusimportacao?: StatusImportacaoInbound;
	statusmanifestacao?: StatusManifestacaoInbound;
	page?: number;
	limit?: number;
};

export async function listarNfeInboundDocumentos({
	idempresa,
	statusimportacao,
	statusmanifestacao,
	page = 1,
	limit = 20,
}: ListarNfeInboundDocumentosParametros) {
	const conditions = [eq(schema.nfeinbounddocumento.idempresa, idempresa)];

	if (statusimportacao) {
		conditions.push(
			eq(schema.nfeinbounddocumento.statusimportacao, statusimportacao),
		);
	}

	if (statusmanifestacao) {
		conditions.push(
			eq(schema.nfeinbounddocumento.statusmanifestacao, statusmanifestacao),
		);
	}

	const offset = (page - 1) * limit;
	const where = and(...conditions);

	const [totalCount, documentos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.nfeinbounddocumento)
			.where(where),
		db
			.select()
			.from(schema.nfeinbounddocumento)
			.where(where)
			.orderBy(desc(schema.nfeinbounddocumento.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		documentos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarNfeInboundDocumento(
	id: string,
	dados: Partial<{
		statusimportacao: StatusImportacaoInbound;
		statusmanifestacao: StatusManifestacaoInbound;
		idrascunho: string | null;
		atualizadoem: string;
	}>,
): Promise<NfeInboundDocumentoRow | undefined> {
	const [atualizado] = await db
		.update(schema.nfeinbounddocumento)
		.set(dados)
		.where(eq(schema.nfeinbounddocumento.id, id))
		.returning();

	return atualizado;
}

/** Libera o documento inbound para nova importação após cancelar a NF de compra. */
export async function liberarNfeInboundDocumentoParaReimportacao(
	idempresa: string,
	chavenfe: string,
): Promise<NfeInboundDocumentoRow | undefined> {
	const documento = await buscarNfeInboundDocumentoPorChave(idempresa, chavenfe);

	if (!documento) {
		return undefined;
	}

	const statusimportacao: StatusImportacaoInbound =
		documento.tipodocumento === "procNFe" && documento.xml
			? "disponivel"
			: "aguardando_xml";

	return atualizarNfeInboundDocumento(documento.id, {
		statusimportacao,
		idrascunho: null,
		atualizadoem: new Date().toISOString(),
	});
}

export async function listarEmpresasComSyncInboundHabilitado(): Promise<
	string[]
> {
	const resultado = await db
		.select({ idempresa: schema.nfeconfiguracao.idempresa })
		.from(schema.nfeconfiguracao)
		.innerJoin(
			schema.certificadodigital,
			eq(
				schema.nfeconfiguracao.idcertificadoativo,
				schema.certificadodigital.id,
			),
		)
		.where(eq(schema.certificadodigital.ativo, true));

	return resultado.map((r) => r.idempresa);
}

export async function tentarAdquirirLockEmpresa(
	lockId: number,
): Promise<boolean> {
	const result = await db.execute(
		sql`SELECT pg_try_advisory_lock(${lockId}) as locked`,
	);
	const rows = (result.rows ?? result) as { locked: boolean }[];
	return rows[0]?.locked === true;
}

export async function liberarLockEmpresa(lockId: number): Promise<void> {
	await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
}
