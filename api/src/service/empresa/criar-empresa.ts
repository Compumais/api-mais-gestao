import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as schema from "../../../drizzle/schema.js";
import type { Empresa } from "../../model/empresa-model.js";
import type { HttpResponse } from "../../model/http-model.js";
import type { Usuario } from "../../model/usuario-model.js";
import { criarContaCorrenteCaixaPadrao } from "../../repositories/conta-corrente-repositories.js";
import { executarComControleAcessoPrivilegiado } from "../../repositories/controle-acesso-contexto.js";
import {
	criarEmpresa,
	type NovaEmpresa,
} from "../../repositories/empresa-repositories.js";
import { httpCriacao, httpRecursoExistente } from "../../util/http-util.js";
import { normalizarPerfilArray } from "../../util/usuario-perfil.js";
import { criarCfopsPadraoService } from "../cfop/criar-cfops-padrao.js";
import { criarPlanoContasPadraoService } from "../planocontas/criar-plano-contas-padrao.js";
import { criarTaxasPadraoService } from "../taxauf/criar-taxas-padrao.js";
import { criarTiposDocumentoFinanceiroPadraoService } from "../tipo-documento-financeiro/criar-tipos-documento-financeiro-padrao.js";

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

	await criarCfopsPadraoService(empresa.id);

	await criarTaxasPadraoService(empresa.id);

	await criarTiposDocumentoFinanceiroPadraoService(empresa.id);

	await criarContaCorrenteCaixaPadrao(empresa.id);

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
