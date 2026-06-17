import type { Empresa } from "../../model/empresa-model.js";
import type { HttpResponse } from "../../model/http-model.js";
import type { Usuario } from "../../model/usuario-model.js";
import {
	criarEmpresa,
	type NovaEmpresa,
} from "../../repositories/empresa-repositories.js";
import { criarPlanoContasPadraoService } from "../planocontas/criar-plano-contas-padrao.js";
import { criarContaCorrenteCaixaPadrao } from "../../repositories/conta-corrente-repositories.js";
import {
	httpCriacao,
	httpRecursoExistente,
} from "../../util/http-util.js";

type CriarEmpresaParametros = {
	dadosEmpresa: NovaEmpresa;
	proprietario: Usuario;
	quantidadeEmpresas: number;
};

export async function criarEmpresaService({
	dadosEmpresa,
	proprietario,
}: CriarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	const [empresa] = await criarEmpresa(dadosEmpresa);

	if (!empresa) {
		return httpRecursoExistente();
	}

	await criarPlanoContasPadraoService(empresa.id);

	await criarContaCorrenteCaixaPadrao(empresa.id);

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
		console.error("Erro ao vincular usu?rio ? empresa:", error);
	}

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
		console.error("Erro ao atualizar perfil do usu?rio:", error);
	}

	return httpCriacao<Empresa>(empresa);
}
