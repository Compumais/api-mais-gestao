import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoNCM } from "@/model/ncm-model";
import { ncm as ncmTable } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarNcmPorId(id: string) {
	const [ncm] = await db.select().from(ncmTable).where(eq(ncmTable.id, id));

	return ncm;
}

export async function criarNcm(dadosNcm: NovoNCM) {
	const [ncm] = await db.insert(ncmTable).values(dadosNcm).returning();

	return ncm;
}

export async function atualizarNcm(
  id: string,
  dadosNcm: Partial<NovoNCM>
) {
  const [ncm] = await db
    .update(ncmTable)
    .set(dadosNcm)
    .where(eq(ncmTable.id, id))
    .returning();

  return ncm;
}

export async function excluirNcm(id: string) {
  const [ncm] = await db
    .delete(ncmTable)
    .where(eq(ncmTable.id, id))
    .returning();

  return ncm;
}

export type ListarNcmsParametros = {
  descricao?: string | undefined;
  inativo?: number | undefined;
  page?: number;
  limit?: number;
}

export async function listarNcms({
  descricao,
  inativo,
  page = 1,
  limit = 10,
}: ListarNcmsParametros) {
  const where = [];

  if (descricao) {
    where.push(ilike(ncmTable.descricao, `%${descricao}%`))
  }

  if (inativo !== undefined) {
    where.push(eq(ncmTable.inativo, inativo))
  }

  const offset = (page - 1) * limit;

  const [totalCount, ncms] = await Promise.all([
    db.select({ value: count() })
      .from(ncmTable)
      .where(and(...where)),
    db.select()
      .from(ncmTable)
      .where(and(...where))
      .orderBy(desc(ncmTable.descricao))
      .limit(limit)
      .offset(offset),
  ])

  return {
    ncms,
    total: totalCount[0]?.value ?? 0,
  }
}