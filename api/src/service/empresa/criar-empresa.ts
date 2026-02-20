import type { Empresa } from "../../model/empresa-model";
import type { HttpResponse } from "../../model/http-model";
import type { Usuario } from "../../model/usuario-model";
import { criarBancosPadrao } from "../../repositories/banco-repositories";
import {
	criarEmpresa,
	type NovaEmpresa,
} from "../../repositories/empresa-repositories";
import {
	httpCriacao,
	httpLimiteExcedido,
	httpRecursoExistente,
} from "../../util/http-util";

type CriarEmpresaParametros = {
	dadosEmpresa: NovaEmpresa;
	proprietario: Usuario;
	quantidadeEmpresas: number;
};

export async function criarEmpresaService({
	dadosEmpresa,
	quantidadeEmpresas,
	proprietario,
}: CriarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	if (
		proprietario.maxempresas &&
		quantidadeEmpresas >= proprietario.maxempresas
	) {
		return httpLimiteExcedido();
	}

	const [empresa] = await criarEmpresa(dadosEmpresa);

	if (!empresa) {
		return httpRecursoExistente();
	}

	// Criar bancos padrão para a nova empresa
	try {
		await criarBancosPadrao(empresa.id);
	} catch (error) {
		console.error("Erro ao criar bancos padrão:", error);
	}

	// Vincular usuário à empresa criada
	try {
		const { db } = await import("../../repositories/connection");
		const { usuarioEmpresa } = await import("../../../drizzle/schema");
		const { v4: uuidv4 } = await import("uuid");

		await db.insert(usuarioEmpresa).values({
			id: uuidv4(),
			idusuario: proprietario.id,
			idempresa: empresa.id,
			atualizadoem: new Date().toISOString(),
			criadoem: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Erro ao vincular usuário à empresa:", error);
		// Log erro mas não falha a criação da empresa, pois o vinculo principal é idproprietario
	}

	// Atualizar perfil do usuário para proprietário se ainda não for
	try {
		const { db } = await import("../../repositories/connection");
		const { usuarios } = await import("../../../drizzle/schema");
		const { eq } = await import("drizzle-orm");

		const perfisAtuais = Array.isArray(proprietario.perfil)
			? proprietario.perfil
			: [proprietario.perfil];

		if (!perfisAtuais.includes("proprietario")) {
			await db
				.update(usuarios)
				.set({
					perfil: [...perfisAtuais, "proprietario"],
				})
				.where(eq(usuarios.id, proprietario.id));
		}
	} catch (error) {
		console.error("Erro ao atualizar perfil do usuário:", error);
		// Não falha a criação da empresa, mas loga o erro
	}

	return httpCriacao<Empresa>(empresa);
}
