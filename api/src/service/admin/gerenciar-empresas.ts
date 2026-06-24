import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { HttpResponse } from "@/model/http-model.js";
import { criarContaCorrenteCaixaPadrao } from "@/repositories/conta-corrente-repositories.js";
import { db } from "@/repositories/connection.js";
import { executarComControleAcessoPrivilegiado } from "@/repositories/controle-acesso-contexto.js";
import { criarEmpresa } from "@/repositories/empresa-repositories.js";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";
import * as schema from "../../../drizzle/schema.js";
import { criarCfopsPadraoService } from "@/service/cfop/criar-cfops-padrao.js";
import { criarPlanoContasPadraoService } from "@/service/planocontas/criar-plano-contas-padrao.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

type CriarEmpresaAdminParams = {
	nome: string;
	cnpj: string;
	telefone: string;
	email?: string;
	endereco?: string;
	idproprietario?: string;
	idusuarioAssociado?: string;
	perfilAssociado?: string | string[];
	idSuperFallback: string;
};

export async function criarEmpresaAdminService(
	params: CriarEmpresaAdminParams,
): Promise<HttpResponse<unknown>> {
	const idproprietario =
		params.idproprietario ?? params.idusuarioAssociado ?? params.idSuperFallback;

	const proprietario = await buscarUsuarioPorId(idproprietario);
	if (!proprietario) {
		return httpNaoEncontrado();
	}

	const agora = new Date().toISOString();
	const [empresa] = await criarEmpresa({
		id: randomUUID(),
		nome: params.nome,
		cnpj: params.cnpj,
		telefone: params.telefone,
		email: params.email ?? "",
		endereco: params.endereco ?? "",
		idproprietario,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!empresa) {
		throw new Error("Falha ao criar empresa");
	}

	await criarPlanoContasPadraoService(empresa.id);
	await criarCfopsPadraoService(empresa.id);
	await criarContaCorrenteCaixaPadrao(empresa.id);

	const usuariosParaVincular = new Set<string>([idproprietario]);
	if (params.idusuarioAssociado) {
		usuariosParaVincular.add(params.idusuarioAssociado);
	}

	await executarComControleAcessoPrivilegiado(async (tx) => {
		for (const idusuario of usuariosParaVincular) {
			await tx.insert(schema.usuarioEmpresa).values({
				id: randomUUID(),
				idusuario,
				idempresa: empresa.id,
				criadoem: agora,
				atualizadoem: agora,
			});
		}

		if (params.perfilAssociado && params.idusuarioAssociado) {
			const usuario = await buscarUsuarioPorId(params.idusuarioAssociado);
			if (usuario) {
				const perfisAtuais = normalizarPerfilArray(usuario.perfil);
				const novosPerfis = [
					...new Set([
						...perfisAtuais,
						...normalizarPerfilArray(params.perfilAssociado),
					]),
				];
				await tx
					.update(schema.usuarios)
					.set({ perfil: novosPerfis })
					.where(eq(schema.usuarios.id, params.idusuarioAssociado));
			}
		}

		if (params.idproprietario || params.idusuarioAssociado) {
			const idAlvo = params.idproprietario ?? params.idusuarioAssociado;
			if (idAlvo) {
				const usuario = await buscarUsuarioPorId(idAlvo);
				if (usuario) {
					const perfisAtuais = normalizarPerfilArray(usuario.perfil);
					if (!perfisAtuais.includes("proprietario")) {
						await tx
							.update(schema.usuarios)
							.set({ perfil: [...perfisAtuais, "proprietario"] })
							.where(eq(schema.usuarios.id, idAlvo));
					}
				}
			}
		}
	});

	return httpOk(empresa);
}

export async function listarEmpresasAdminService(): Promise<HttpResponse<unknown>> {
	const empresas = await db
		.select({
			id: schema.empresa.id,
			nome: schema.empresa.nome,
			cnpj: schema.empresa.cnpj,
			telefone: schema.empresa.telefone,
			email: schema.empresa.email,
			idproprietario: schema.empresa.idproprietario,
			criadoem: schema.empresa.criadoem,
		})
		.from(schema.empresa)
		.orderBy(desc(schema.empresa.criadoem));

	return httpOk({ empresas });
}
