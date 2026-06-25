import { eq } from "drizzle-orm";
import type { HttpResponse } from "@/model/http-model.js";
import { db } from "@/repositories/connection.js";
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
import { verificarPodeGerenciarUsuarios } from "@/util/verificar-gestao-usuarios.js";
import * as schema from "../../../drizzle/schema.js";

type ExcluirUsuarioParametros = {
	idusuario: string; // Usuário que está excluindo
	idUsuarioExcluir: string; // ID do usuário a ser excluído
	idempresa: string; // Empresa atual
};

export async function excluirUsuarioService({
	idusuario,
	idUsuarioExcluir,
	idempresa,
}: ExcluirUsuarioParametros): Promise<HttpResponse<null>> {
	if (idusuario === idUsuarioExcluir) {
		return httpNaoAutorizado();
	}

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

	const usuarioExistente = await buscarUsuarioPorId(idUsuarioExcluir);
	if (!usuarioExistente) {
		return httpNaoEncontrado();
	}

	try {
		const empresasProprietario = await db
			.select()
			.from(schema.empresa)
			.where(eq(schema.empresa.idproprietario, idUsuarioExcluir))
			.limit(1);

		if (empresasProprietario.length > 0) {
			return {
				success: false,
				status: 400,
				error:
					"Não é possível excluir um usuário que é proprietário de uma empresa",
				code: "CANNOT_DELETE_OWNER",
			};
		}

		await executarComControleAcessoPrivilegiado(async (tx) => {
			await tx
				.delete(schema.usuarioEmpresa)
				.where(eq(schema.usuarioEmpresa.idusuario, idUsuarioExcluir));
		});

		await db
			.delete(schema.usuarios)
			.where(eq(schema.usuarios.id, idUsuarioExcluir));

		return httpOk<null>(null);
	} catch (error) {
		console.error("Erro ao excluir usuário:", error);
		return httpErroInterno();
	}
}
