import { eq } from "drizzle-orm";
import { db } from "@/repositories/connection.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";
import * as schema from "../../../drizzle/schema.js";
import {
	type CandidatoAdministradorBase,
	escolherAdministradorBase,
} from "./escolher-administrador-base.js";

export async function resolverAdministradorBase(idempresa: string) {
	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa?.idproprietario) {
		return { empresa: null, administrador: null };
	}

	const vinculados = await db
		.select({
			id: schema.usuarios.id,
			perfil: schema.usuarios.perfil,
			ativo: schema.usuarios.ativo,
		})
		.from(schema.usuarioEmpresa)
		.innerJoin(
			schema.usuarios,
			eq(schema.usuarios.id, schema.usuarioEmpresa.idusuario),
		)
		.where(eq(schema.usuarioEmpresa.idempresa, idempresa));

	const candidatos = new Map<string, CandidatoAdministradorBase>();
	for (const vinculado of vinculados) {
		candidatos.set(vinculado.id, vinculado);
	}

	if (!candidatos.has(empresa.idproprietario)) {
		const proprietario = await buscarUsuarioPorId(empresa.idproprietario);
		if (proprietario) {
			candidatos.set(proprietario.id, {
				id: proprietario.id,
				perfil: proprietario.perfil,
				ativo: proprietario.ativo,
			});
		}
	}

	const escolhido = escolherAdministradorBase(
		[...candidatos.values()],
		empresa.idproprietario,
	);
	if (!escolhido) {
		return { empresa, administrador: null };
	}

	const administrador = await buscarUsuarioPorId(escolhido.id);
	return { empresa, administrador };
}
