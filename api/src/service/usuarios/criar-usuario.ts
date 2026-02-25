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
	httpNaoAutorizado,
} from "@/util/http-util.js";
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

export async function criarUsuarioService({
	idusuario,
	idempresa,
	nome,
	email,
	password,
	perfil,
	empresasIds = [],
}: CriarUsuarioParametros): Promise<HttpResponse<Usuario | null>> {
	// Verificar se o usuário que está criando pertence à empresa
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	try {
		// Criar usuário usando Better Auth
		const resultado = await auth.api.signUpEmail({
			body: {
				name: nome,
				email,
				password,
			},
		});

		if (!resultado.user?.id) {
			return httpErroInterno();
		}

		const novoUsuarioId = resultado.user.id;

		// Atualizar perfil do usuário
		const perfilArray = Array.isArray(perfil) ? perfil : [perfil];
		await db
			.update(schema.usuarios)
			.set({
				perfil: perfilArray,
			})
			.where(eq(schema.usuarios.id, novoUsuarioId));

		// Associar usuário às empresas (incluindo a empresa atual)
		const empresasParaAssociar = [...new Set([idempresa, ...empresasIds])];

		for (const empresaId of empresasParaAssociar) {
			// Verificar se já existe associação
			const [existe] = await db
				.select()
				.from(schema.usuarioEmpresa)
				.where(
					and(
						eq(schema.usuarioEmpresa.idusuario, novoUsuarioId),
						eq(schema.usuarioEmpresa.idempresa, empresaId),
					),
				)
				.limit(1);

			if (!existe) {
				await db.insert(schema.usuarioEmpresa).values({
					id: crypto.randomUUID(),
					idusuario: novoUsuarioId,
					idempresa: empresaId,
					criadoem: new Date().toISOString(),
					atualizadoem: new Date().toISOString(),
				});
			}
		}

		// Buscar usuário criado
		const usuario = await buscarUsuarioPorId(novoUsuarioId);

		if (!usuario) {
			return httpErroInterno();
		}

		return httpCriacao<Usuario>(usuario);
	} catch (error) {
		console.error("Erro ao criar usuário:", error);
		return httpErroInterno();
	}
}
