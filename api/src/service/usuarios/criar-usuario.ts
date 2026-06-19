import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { Usuario } from "@/model/usuario-model.js";
import { db } from "@/repositories/connection.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";
import {
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import {
	perfisPersistidosIguais,
	toPerfilArray,
} from "@/util/usuario-perfil.js";
import * as schema from "../../../drizzle/schema.js";

type CriarUsuarioParametros = {
	idusuario: string; // Usuário que está criando
	idempresa: string; // Empresa onde o usuário será associado
	nome: string;
	email: string;
	password: string;
	perfil: string | string[];
	empresasIds?: string[]; // IDs das empresas que o usuário pode ver
};

async function rollbackCriacaoUsuario(novoUsuarioId: string) {
	try {
		await db
			.delete(schema.usuarioEmpresa)
			.where(eq(schema.usuarioEmpresa.idusuario, novoUsuarioId));
	} catch (error) {
		console.error(
			"Erro ao remover vinculos usuario_empresa no rollback:",
			error,
		);
	}

	try {
		await db
			.delete(schema.usuarios)
			.where(eq(schema.usuarios.id, novoUsuarioId));
	} catch (error) {
		console.error("Erro ao remover usuario no rollback:", error);
	}
}

export async function criarUsuarioService({
	idusuario,
	idempresa,
	nome,
	email,
	password,
	perfil,
	empresasIds = [],
}: CriarUsuarioParametros): Promise<HttpResponse<Usuario | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let novoUsuarioId: string | null = null;
	const perfilArray = toPerfilArray(perfil);

	try {
		const resultado = await auth.api.signUpEmail({
			body: {
				name: nome,
				email,
				password,
				perfil: perfilArray,
			} as {
				name: string;
				email: string;
				password: string;
				perfil: string[];
			},
		});

		if (!resultado.user?.id) {
			return httpErroInterno();
		}

		novoUsuarioId = resultado.user.id;

		const empresasParaAssociar = [...new Set([idempresa, ...empresasIds])];

		await db.transaction(async (tx) => {
			const [usuarioAtualizado] = await tx
				.update(schema.usuarios)
				.set({
					perfil: perfilArray,
				})
				.where(eq(schema.usuarios.id, novoUsuarioId as string))
				.returning({ perfil: schema.usuarios.perfil });

			if (
				!usuarioAtualizado ||
				!perfisPersistidosIguais(usuarioAtualizado.perfil, perfilArray)
			) {
				throw new Error("Falha ao persistir perfil do usuário");
			}

			for (const empresaId of empresasParaAssociar) {
				const [existe] = await tx
					.select()
					.from(schema.usuarioEmpresa)
					.where(
						and(
							eq(schema.usuarioEmpresa.idusuario, novoUsuarioId as string),
							eq(schema.usuarioEmpresa.idempresa, empresaId),
						),
					)
					.limit(1);

				if (!existe) {
					await tx.insert(schema.usuarioEmpresa).values({
						id: crypto.randomUUID(),
						idusuario: novoUsuarioId as string,
						idempresa: empresaId,
						criadoem: new Date().toISOString(),
						atualizadoem: new Date().toISOString(),
					});
				}
			}
		});

		const usuario = await buscarUsuarioPorId(novoUsuarioId);

		if (
			!usuario ||
			!perfisPersistidosIguais(usuario.perfil, perfilArray)
		) {
			await rollbackCriacaoUsuario(novoUsuarioId);
			return httpErroInterno();
		}

		return httpCriacao<Usuario>(usuario);
	} catch (error) {
		console.error("Erro ao criar usuário:", error);
		if (novoUsuarioId) {
			await rollbackCriacaoUsuario(novoUsuarioId);
		}
		return httpErroInterno();
	}
}
