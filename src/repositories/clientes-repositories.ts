import type { NovoCliente } from "@/model/cliente-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarCliente(dadosCliente: NovoCliente) {
	const [cliente] = await db
		.insert(schema.cliente)
		.values(dadosCliente)
		.returning();

	return cliente;
}
