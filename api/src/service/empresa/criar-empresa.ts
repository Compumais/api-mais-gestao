import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as schema from "../../../drizzle/schema.js";
import type { Empresa } from "../../model/empresa-model.js";
import type { HttpResponse } from "../../model/http-model.js";
import type { Usuario } from "../../model/usuario-model.js";
import { executarComControleAcessoPrivilegiado } from "../../repositories/controle-acesso-contexto.js";
import {
	criarEmpresa,
	type NovaEmpresa,
	buscarEmpresaPorCnpj,
} from "../../repositories/empresa-repositories.js";
import { httpCriacao, httpRecursoExistente } from "../../util/http-util.js";
import { normalizarCnpj } from "../../util/criptografia-certificado.js";
import { normalizarPerfilArray } from "../../util/usuario-perfil.js";
import { popularDadosPadraoEmpresa } from "./popular-dados-padrao-empresa.js";

type CriarEmpresaParametros = {
	dadosEmpresa: NovaEmpresa;
	proprietario: Usuario;
	quantidadeEmpresas: number;
};

export async function criarEmpresaService({
	dadosEmpresa,
	proprietario,
}: CriarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	const cnpjNormalizado = normalizarCnpj(dadosEmpresa.cnpj);
	const empresaExistente = await buscarEmpresaPorCnpj(cnpjNormalizado);

	if (empresaExistente) {
		return httpRecursoExistente("CNPJ já cadastrado");
	}

	const dadosEmpresaNormalizados: NovaEmpresa = {
		...dadosEmpresa,
		cnpj: cnpjNormalizado,
	};

	const [empresa] = await criarEmpresa(dadosEmpresaNormalizados);

	if (!empresa) {
		return httpRecursoExistente("CNPJ já cadastrado");
	}

	await popularDadosPadraoEmpresa(empresa.id);

	try {
		await executarComControleAcessoPrivilegiado(async (tx) => {
			await tx.insert(schema.usuarioEmpresa).values({
				id: uuidv4(),
				idusuario: proprietario.id,
				idempresa: empresa.id,
				atualizadoem: new Date().toISOString(),
				criadoem: new Date().toISOString(),
			});

			const perfisAtuais = normalizarPerfilArray(proprietario.perfil);

			if (!perfisAtuais.includes("proprietario")) {
				await tx
					.update(schema.usuarios)
					.set({
						perfil: [...perfisAtuais, "proprietario"],
					})
					.where(eq(schema.usuarios.id, proprietario.id));
			}
		});
	} catch (error) {
		console.error(
			"Erro ao vincular usuário à empresa ou atualizar perfil:",
			error,
		);
	}

	return httpCriacao<Empresa>(empresa);
}
