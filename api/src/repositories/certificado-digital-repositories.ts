import { and, eq } from "drizzle-orm";
import { certificadodigital } from "@/repositories/schema.js";
import { db } from "./connection";

export type CertificadoDigital = typeof certificadodigital.$inferSelect;
export type NovoCertificadoDigital = typeof certificadodigital.$inferInsert;

const camposResumo = {
	id: certificadodigital.id,
	idempresa: certificadodigital.idempresa,
	apelido: certificadodigital.apelido,
	cnpjcertificado: certificadodigital.cnpjcertificado,
	validadeinicio: certificadodigital.validadeinicio,
	validadefim: certificadodigital.validadefim,
	serial: certificadodigital.serial,
	thumbprint: certificadodigital.thumbprint,
	ativo: certificadodigital.ativo,
	criadoem: certificadodigital.criadoem,
	atualizadoem: certificadodigital.atualizadoem,
};

export async function listarCertificadosDigitaisPorEmpresa(idempresa: string) {
	return db
		.select(camposResumo)
		.from(certificadodigital)
		.where(eq(certificadodigital.idempresa, idempresa));
}

export async function buscarCertificadoDigitalPorId(id: string) {
	const [registro] = await db
		.select()
		.from(certificadodigital)
		.where(eq(certificadodigital.id, id));

	return registro;
}

export async function buscarCertificadoDigitalResumoPorId(id: string) {
	const [registro] = await db
		.select(camposResumo)
		.from(certificadodigital)
		.where(eq(certificadodigital.id, id));

	return registro;
}

export async function buscarCertificadoAtivoPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(certificadodigital)
		.where(
			and(
				eq(certificadodigital.idempresa, idempresa),
				eq(certificadodigital.ativo, true),
			),
		);

	return registro;
}

export async function criarCertificadoDigital(dados: NovoCertificadoDigital) {
	const [registro] = await db
		.insert(certificadodigital)
		.values(dados)
		.returning();

	return registro;
}

export async function excluirCertificadoDigital(id: string) {
	const [registro] = await db
		.delete(certificadodigital)
		.where(eq(certificadodigital.id, id))
		.returning();

	return registro;
}

export async function desativarCertificadosDaEmpresa(idempresa: string) {
	await db
		.update(certificadodigital)
		.set({ ativo: false, atualizadoem: new Date().toISOString() })
		.where(eq(certificadodigital.idempresa, idempresa));
}

export async function ativarCertificadoDigital(id: string, idempresa: string) {
	await desativarCertificadosDaEmpresa(idempresa);

	const [registro] = await db
		.update(certificadodigital)
		.set({ ativo: true, atualizadoem: new Date().toISOString() })
		.where(
			and(
				eq(certificadodigital.id, id),
				eq(certificadodigital.idempresa, idempresa),
			),
		)
		.returning(camposResumo);

	return registro;
}
