import { eq } from "drizzle-orm";
import type { HttpResponse } from "@/model/http-model.js";
import type { Usuario } from "@/model/usuario-model.js";
import { executarComControleAcessoPrivilegiado } from "@/repositories/controle-acesso-contexto.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	perfisPersistidosIguais,
	toPerfilArray,
} from "@/util/usuario-perfil.js";
import { verificarPodeGerenciarUsuarios } from "@/util/verificar-gestao-usuarios.js";
import * as schema from "../../../drizzle/schema.js";

type AtualizarUsuarioParametros = {
	idusuario: string; // Usuário que está atualizando
	idUsuarioAtualizar: string; // ID do usuário a ser atualizado
	idempresa: string; // Empresa atual
	nome?: string | undefined;
	perfil?: string | string[] | undefined;
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
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	const autor = await buscarUsuarioPorId(idusuario);
	if (!autor || !verificarPodeGerenciarUsuarios(autor.perfil)) {
		return httpProibido();
	}

	const usuarioExistente = await buscarUsuarioPorId(idUsuarioAtualizar);
	if (!usuarioExistente) {
		return httpNaoEncontrado();
	}

	try {
		const perfilArray =
			perfil !== undefined ? toPerfilArray(perfil) : undefined;
		const empresasParaAssociar =
			empresasIds !== undefined
				? [...new Set([idempresa, ...empresasIds])]
				: undefined;

		await executarComControleAcessoPrivilegiado(async (tx) => {
			const dadosAtualizacao: {
				nome?: string;
				perfil?: string[];
			} = {};

			if (nome !== undefined) {
				dadosAtualizacao.nome = nome;
			}
			if (perfilArray !== undefined) {
				dadosAtualizacao.perfil = perfilArray;
			}

			if (Object.keys(dadosAtualizacao).length > 0) {
				const [usuarioAtualizado] = await tx
					.update(schema.usuarios)
					.set(dadosAtualizacao)
					.where(eq(schema.usuarios.id, idUsuarioAtualizar))
					.returning({ perfil: schema.usuarios.perfil });

				if (!usuarioAtualizado) {
					throw new Error("Falha ao persistir dados do usuário");
				}

				if (
					perfilArray !== undefined &&
					!perfisPersistidosIguais(usuarioAtualizado.perfil, perfilArray)
				) {
					throw new Error("Falha ao persistir perfil do usuário");
				}
			}

			if (empresasParaAssociar !== undefined) {
				await tx
					.delete(schema.usuarioEmpresa)
					.where(eq(schema.usuarioEmpresa.idusuario, idUsuarioAtualizar));

				for (const empresaId of empresasParaAssociar) {
					await tx.insert(schema.usuarioEmpresa).values({
						id: crypto.randomUUID(),
						idusuario: idUsuarioAtualizar,
						idempresa: empresaId,
						criadoem: new Date().toISOString(),
						atualizadoem: new Date().toISOString(),
					});
				}
			}
		});

		const usuario = await buscarUsuarioPorId(idUsuarioAtualizar);

		if (!usuario) {
			return httpErroInterno();
		}

		if (
			perfilArray !== undefined &&
			!perfisPersistidosIguais(usuario.perfil, perfilArray)
		) {
			return httpErroInterno();
		}

		return httpOk<Usuario>(usuario);
	} catch (error) {
		console.error("Erro ao atualizar usuário:", error);
		return httpErroInterno();
	}
}
