import { desc, eq } from "drizzle-orm";
import { assinaturas, clientesasaas } from "../../drizzle/schema.js";
import type {
	Assinatura,
	ClienteAsaas,
	NovaAssinatura,
	NovoClienteAsaas,
} from "../model/assinatura-model.js";
import { db } from "./connection.js";

export async function buscarClienteAsaas(
	idempresa: string,
): Promise<ClienteAsaas | undefined> {
	const result = await db
		.select()
		.from(clientesasaas)
		.where(eq(clientesasaas.idempresa, idempresa))
		.limit(1);
	return result[0];
}

export async function criarClienteAsaas(
	cliente: NovoClienteAsaas,
): Promise<ClienteAsaas | undefined> {
	const [result] = await db.insert(clientesasaas).values(cliente).returning();

	return result;
}

export async function buscarAssinaturaPeloIdAsaas(
	idassinaturaasaas: string,
): Promise<Assinatura | undefined> {
	const result = await db
		.select()
		.from(assinaturas)
		.where(eq(assinaturas.idassinaturaasaas, idassinaturaasaas))
		.limit(1);

	return result[0];
}

export async function criarAssinatura(
	assinatura: NovaAssinatura,
): Promise<Assinatura | undefined> {
	const [result] = await db.insert(assinaturas).values(assinatura).returning();

	return result;
}

export async function atualizarAssinatura(
	id: string,
	dados: Partial<Assinatura>,
): Promise<Assinatura | undefined> {
	const result = await db
		.update(assinaturas)
		.set(dados)
		.where(eq(assinaturas.id, id))
		.returning();
	return result[0];
}

export async function buscarAssinaturaPorEmpresa(
	idempresa: string,
): Promise<Assinatura | undefined> {
	const result = await db
		.select()
		.from(assinaturas)
		.where(eq(assinaturas.idempresa, idempresa))
		.orderBy(desc(assinaturas.criadoem))
		.limit(1);
	return result[0];
}
