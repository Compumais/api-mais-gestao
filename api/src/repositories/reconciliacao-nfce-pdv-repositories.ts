import { and, asc, eq, gt, isNotNull, lte, or, sql } from "drizzle-orm";
import { notafiscal, vendapdvgourmet } from "@/repositories/schema.js";
import { db, pool } from "./connection.js";

export async function executarComLockReconciliacaoNfce<T>(
	idempresa: string,
	numeropdv: number,
	executar: () => Promise<T>,
): Promise<{ adquirido: true; resultado: T } | { adquirido: false }> {
	const cliente = await pool.connect();
	const chaveLock = `nfce-pdv:${idempresa}:${numeropdv}`;

	try {
		const resultadoLock = await cliente.query<{ adquirido: boolean }>(
			"SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS adquirido",
			[chaveLock],
		);

		if (resultadoLock.rows[0]?.adquirido !== true) {
			return { adquirido: false };
		}

		try {
			return { adquirido: true, resultado: await executar() };
		} finally {
			await cliente.query(
				"SELECT pg_advisory_unlock(hashtextextended($1, 0))",
				[chaveLock],
			);
		}
	} finally {
		cliente.release();
	}
}

export async function buscarVendaParaReconciliacaoNfce({
	idempresa,
	numeropdv,
	idvendalocal,
	idvendaremoto,
}: {
	idempresa: string;
	numeropdv: number;
	idvendalocal: string;
	idvendaremoto?: string;
}) {
	const [porIdentidadeLocal] = await db
		.select()
		.from(vendapdvgourmet)
		.where(
			and(
				eq(vendapdvgourmet.idempresa, idempresa),
				eq(vendapdvgourmet.numeropdv, numeropdv),
				eq(vendapdvgourmet.idvendalocal, idvendalocal),
			),
		)
		.limit(1);

	if (porIdentidadeLocal || !idvendaremoto) {
		return porIdentidadeLocal;
	}

	const [porIdRemoto] = await db
		.select()
		.from(vendapdvgourmet)
		.where(eq(vendapdvgourmet.id, idvendaremoto))
		.limit(1);

	return porIdRemoto;
}

const atualizadoEmNfce = sql<string>`greatest(
	coalesce(${notafiscal.dataalteracao}, ${notafiscal.datainclusao}, 'epoch'::timestamp),
	coalesce(${vendapdvgourmet.dataalteracao}, ${vendapdvgourmet.datacriacao}, 'epoch'::timestamp)
)`;

function decomporCursor(cursor: string): {
	atualizadoEm: string;
	idvendaremoto?: string;
} {
	const separador = cursor.lastIndexOf("|");
	if (separador < 0) {
		return { atualizadoEm: cursor };
	}
	const atualizadoEm = cursor.slice(0, separador);
	const idvendaremoto = cursor.slice(separador + 1);
	return {
		atualizadoEm,
		...(idvendaremoto ? { idvendaremoto } : {}),
	};
}

export async function listarDeltaNfcePdv({
	idempresa,
	numeropdv,
	cursor,
	servidorEm,
	limite,
}: {
	idempresa: string;
	numeropdv: number;
	cursor?: string;
	servidorEm: string;
	limite: number;
}) {
	const filtros = [
		eq(vendapdvgourmet.idempresa, idempresa),
		eq(vendapdvgourmet.numeropdv, numeropdv),
		eq(vendapdvgourmet.vendalocal, 3),
		isNotNull(vendapdvgourmet.idvendalocal),
		lte(atualizadoEmNfce, servidorEm),
	];

	if (cursor) {
		const cursorComposto = decomporCursor(cursor);
		const filtroCursor = cursorComposto.idvendaremoto
			? or(
					gt(atualizadoEmNfce, cursorComposto.atualizadoEm),
					and(
						eq(atualizadoEmNfce, cursorComposto.atualizadoEm),
						gt(vendapdvgourmet.id, cursorComposto.idvendaremoto),
					),
				)
			: gt(atualizadoEmNfce, cursorComposto.atualizadoEm);
		if (filtroCursor) {
			filtros.push(filtroCursor);
		}
	}

	return db
		.select({
			idvendalocal: vendapdvgourmet.idvendalocal,
			idvendaremoto: vendapdvgourmet.id,
			idnotafiscal: notafiscal.id,
			status: notafiscal.status,
			chave: notafiscal.chavenfe,
			serie: notafiscal.serie,
			numero: notafiscal.numeronotafiscal,
			protocolo: notafiscal.protocolonfe,
			atualizadoEm: atualizadoEmNfce,
		})
		.from(vendapdvgourmet)
		.leftJoin(notafiscal, eq(notafiscal.id, vendapdvgourmet.idnotafiscalnfce))
		.where(and(...filtros))
		.orderBy(asc(atualizadoEmNfce), asc(vendapdvgourmet.id))
		.limit(limite);
}
