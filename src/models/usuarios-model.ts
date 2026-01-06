import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { db } from "./connection";

type Usuario = typeof schema.usuarios.$inferSelect;

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.id, id));

	return usuario || null;
}
