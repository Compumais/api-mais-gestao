import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth.js";
import type { HttpResponse } from "@/model/http-model.js";
import { executarComControleAcessoPrivilegiado } from "@/repositories/controle-acesso-contexto.js";
import {
	atualizarSenhaContaUsuario,
	atualizarUsuarioAdmin,
	buscarUsuarioPorId,
	emailJaUtilizado,
	inativarSessoesUsuario,
} from "@/repositories/usuarios-repositories.js";
import * as schema from "../../../drizzle/schema.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpRecursoExistente,
} from "@/util/http-util.js";
import { hashSenha } from "@/util/hash-senha.js";
import { toPerfilArray } from "@/util/usuario-perfil.js";

export async function atualizarUsuarioAdminService({
	id,
	nome,
	email,
	perfil,
}: {
	id: string;
	nome?: string;
	email?: string;
	perfil?: string | string[];
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(id);
	if (!usuario) {
		return httpNaoEncontrado();
	}

	if (email && (await emailJaUtilizado(email, id))) {
		return httpRecursoExistente();
	}

	const atualizado = await atualizarUsuarioAdmin(id, {
		...(nome !== undefined && { nome }),
		...(email !== undefined && { email }),
		...(perfil !== undefined && { perfil: toPerfilArray(perfil) }),
	});

	return httpOk(atualizado);
}

export async function alterarSenhaUsuarioAdminService({
	id,
	novaSenha,
}: {
	id: string;
	novaSenha: string;
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(id);
	if (!usuario) {
		return httpNaoEncontrado();
	}

	const senhaHash = await hashSenha(novaSenha);
	await atualizarSenhaContaUsuario(id, senhaHash);
	await inativarSessoesUsuario(id);

	return httpOk({ sucesso: true });
}

export async function inativarUsuarioAdminService({
	id,
}: {
	id: string;
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(id);
	if (!usuario) {
		return httpNaoEncontrado();
	}

	const atualizado = await atualizarUsuarioAdmin(id, { ativo: false });
	await inativarSessoesUsuario(id);

	return httpOk(atualizado);
}

export async function ativarUsuarioAdminService({
	id,
}: {
	id: string;
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(id);
	if (!usuario) {
		return httpNaoEncontrado();
	}

	const atualizado = await atualizarUsuarioAdmin(id, { ativo: true });
	return httpOk(atualizado);
}

export async function criarUsuarioAdminService({
	nome,
	email,
	password,
	perfil,
	empresasIds = [],
	plano,
}: {
	nome: string;
	email: string;
	password: string;
	perfil: string | string[];
	empresasIds?: string[];
	plano?: string | null;
}): Promise<HttpResponse<unknown>> {
	if (await emailJaUtilizado(email)) {
		return httpRecursoExistente();
	}

	const perfilArray = toPerfilArray(perfil);

	const resultado = await auth.api.signUpEmail({
		body: { name: nome, email, password },
	});

	if (!resultado.user?.id) {
		throw new Error("Falha ao criar usuário");
	}

	const novoUsuarioId = resultado.user.id;

	await executarComControleAcessoPrivilegiado(async (tx) => {
		await tx
			.update(schema.usuarios)
			.set({
				perfil: perfilArray,
				...(plano !== undefined && { plano }),
			})
			.where(eq(schema.usuarios.id, novoUsuarioId));

		for (const idempresa of empresasIds) {
			const [existe] = await tx
				.select()
				.from(schema.usuarioEmpresa)
				.where(
					and(
						eq(schema.usuarioEmpresa.idusuario, novoUsuarioId),
						eq(schema.usuarioEmpresa.idempresa, idempresa),
					),
				)
				.limit(1);

			if (!existe) {
				await tx.insert(schema.usuarioEmpresa).values({
					id: crypto.randomUUID(),
					idusuario: novoUsuarioId,
					idempresa,
					criadoem: new Date().toISOString(),
					atualizadoem: new Date().toISOString(),
				});
			}
		}
	});

	const usuario = await buscarUsuarioPorId(novoUsuarioId);
	return httpOk(usuario);
}

export async function associarUsuarioEmpresaAdminService({
	idusuario,
	idempresa,
	perfilNaEmpresa,
}: {
	idusuario: string;
	idempresa: string;
	perfilNaEmpresa?: string | string[];
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		return httpNaoEncontrado();
	}

	await executarComControleAcessoPrivilegiado(async (tx) => {
		const [existe] = await tx
			.select()
			.from(schema.usuarioEmpresa)
			.where(
				and(
					eq(schema.usuarioEmpresa.idusuario, idusuario),
					eq(schema.usuarioEmpresa.idempresa, idempresa),
				),
			)
			.limit(1);

		if (!existe) {
			await tx.insert(schema.usuarioEmpresa).values({
				id: crypto.randomUUID(),
				idusuario,
				idempresa,
				criadoem: new Date().toISOString(),
				atualizadoem: new Date().toISOString(),
			});
		}

		if (perfilNaEmpresa) {
			const perfisAtuais = toPerfilArray(usuario.perfil);
			const novosPerfis = [
				...new Set([...perfisAtuais, ...toPerfilArray(perfilNaEmpresa)]),
			];
			await tx
				.update(schema.usuarios)
				.set({ perfil: novosPerfis })
				.where(eq(schema.usuarios.id, idusuario));
		}
	});

	return httpOk({ sucesso: true });
}
