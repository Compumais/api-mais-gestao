import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories";
import { httpOk, httpErroInterno, httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util";
import { db } from "@/repositories/connection";
import * as schema from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

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
	// Não permitir que o usuário exclua a si mesmo
	if (idusuario === idUsuarioExcluir) {
		return httpNaoAutorizado();
	}

	// Verificar se o usuário que está excluindo pertence à empresa
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	// Verificar se o usuário a ser excluído existe
	const usuarioExistente = await buscarUsuarioPorId(idUsuarioExcluir);
	if (!usuarioExistente) {
		return httpNaoEncontrado();
	}

	try {
		// Remover todas as associações com empresas
		await db
			.delete(schema.usuarioEmpresa)
			.where(eq(schema.usuarioEmpresa.idusuario, idUsuarioExcluir));

		// Excluir o usuário (Better Auth gerencia isso via cascade)
		// Mas precisamos verificar se o usuário é proprietário de alguma empresa
		const empresasProprietario = await db
			.select()
			.from(schema.empresa)
			.where(eq(schema.empresa.idproprietario, idUsuarioExcluir))
			.limit(1);

		if (empresasProprietario.length > 0) {
			// Não permitir excluir se for proprietário de empresa
			return {
				success: false,
				status: 400,
				error: "Não é possível excluir um usuário que é proprietário de uma empresa",
				code: "CANNOT_DELETE_OWNER",
			};
		}

		// Excluir o usuário
		await db.delete(schema.usuarios).where(eq(schema.usuarios.id, idUsuarioExcluir));

		return httpOk<null>(null);
	} catch (error) {
		console.error("Erro ao excluir usuário:", error);
		return httpErroInterno();
	}
}

