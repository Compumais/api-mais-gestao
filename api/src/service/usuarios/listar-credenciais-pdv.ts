import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarCredenciaisPdvPorEmpresa,
	type CredencialPdvUsuario,
} from "@/repositories/usuarios-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type CredencialPdvItem = {
	id: string;
	email: string;
	nome: string;
	perfil: string[];
	ativo: boolean;
	passwordHash: string | null;
	atualizadoem: string;
};

type ListarCredenciaisPdvParametros = {
	idusuario: string;
	idempresa: string;
};

type ListarCredenciaisPdvResposta = {
	data: CredencialPdvItem[];
	idempresa: string;
};

function mapearCredencial(row: CredencialPdvUsuario): CredencialPdvItem {
	return {
		id: row.id,
		email: row.email,
		nome: row.nome,
		perfil: row.perfil,
		ativo: row.ativo,
		passwordHash: row.passwordHash,
		atualizadoem: row.atualizadoem.toISOString(),
	};
}

/**
 * Endpoint exclusivo do PDV: exporta hashes scrypt (Better Auth) para login offline.
 * Exige que o usuário autenticado pertença à empresa solicitada.
 */
export async function listarCredenciaisPdvService({
	idusuario,
	idempresa,
}: ListarCredenciaisPdvParametros): Promise<
	HttpResponse<ListarCredenciaisPdvResposta>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) {
		return httpProibido();
	}

	const rows = await listarCredenciaisPdvPorEmpresa(idempresa);
	return httpOk<ListarCredenciaisPdvResposta>({
		data: rows.map(mapearCredencial),
		idempresa,
	});
}
