import type { HttpResponse } from "@/model/http-model";
import type { Usuario } from "@/model/usuario-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories";
import { httpCriacao, httpErroInterno, httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util";
import { db } from "@/repositories/connection";
import * as schema from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

type AtualizarUsuarioParametros = {
	idusuario: string; // Usuário que está atualizando
	idUsuarioAtualizar: string; // ID do usuário a ser atualizado
	idempresa: string; // Empresa atual
	nome?: string;
	perfil?: string | string[];
	empresasIds?: string[]; // IDs das empresas que o usuário pode ver
};

export async function atualizarUsuarioService({
	idusuario,
	idUsuarioAtualizar,
	idempresa,
	nome,
	perfil,
	empresasIds,
}: AtualizarUsuarioParametros): Promise<HttpResponse<Usuario | null>> {
	// Verificar se o usuário que está atualizando pertence à empresa
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	// Verificar se o usuário a ser atualizado existe
	const usuarioExistente = await buscarUsuarioPorId(idUsuarioAtualizar);
	if (!usuarioExistente) {
		return httpNaoEncontrado();
	}

	try {
		// Atualizar nome se fornecido
		if (nome !== undefined) {
			await db
				.update(schema.usuarios)
				.set({ nome })
				.where(eq(schema.usuarios.id, idUsuarioAtualizar));
		}

		// Atualizar perfil se fornecido
		if (perfil !== undefined) {
			const perfilArray = Array.isArray(perfil) ? perfil : [perfil];
			await db
				.update(schema.usuarios)
				.set({ perfil: perfilArray })
				.where(eq(schema.usuarios.id, idUsuarioAtualizar));
		}

		// Atualizar empresas associadas se fornecido
		if (empresasIds !== undefined) {
			// Remover todas as associações existentes
			await db
				.delete(schema.usuarioEmpresa)
				.where(eq(schema.usuarioEmpresa.idusuario, idUsuarioAtualizar));

			// Criar novas associações
			for (const empresaId of empresasIds) {
				await db.insert(schema.usuarioEmpresa).values({
					id: crypto.randomUUID(),
					idusuario: idUsuarioAtualizar,
					idempresa: empresaId,
					criadoem: new Date().toISOString(),
					atualizadoem: new Date().toISOString(),
				});
			}
		}

		// Buscar usuário atualizado
		const usuario = await buscarUsuarioPorId(idUsuarioAtualizar);

		if (!usuario) {
			return httpErroInterno();
		}

		return httpCriacao<Usuario>(usuario);
	} catch (error) {
		console.error("Erro ao atualizar usuário:", error);
		return httpErroInterno();
	}
}

