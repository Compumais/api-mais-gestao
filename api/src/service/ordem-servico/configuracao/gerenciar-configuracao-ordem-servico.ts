import { v4 as uuidv4 } from "uuid";
import type { ConfiguracaoOrdemServico } from "@/model/configuracao-ordem-servico-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { atualizarConfiguracaoOrdemServico } from "@/repositories/configuracao-ordem-servico-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import type { CampoExtraOrdemServico } from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	garantirConfiguracaoOrdemServico,
	validarCamposExtrasConfigurados,
} from "@/service/ordem-servico/ordem-servico-helpers.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

export async function buscarConfiguracaoOrdemServicoService(params: {
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<ConfiguracaoOrdemServico | null>> {
	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();

	const config = await garantirConfiguracaoOrdemServico(params.idempresa);
	return httpOk(config);
}

export async function atualizarConfiguracaoOrdemServicoService(params: {
	idempresa: string;
	idusuario: string;
	roles: string | string[];
	dados: {
		agrupafinanceiroaofaturar?: number | undefined;
		descricao?: string | null | undefined;
		descricaocampochave?: string | null | undefined;
		idcfopexternaproduto?: string | null | undefined;
		idcfopexternaservico?: string | null | undefined;
		idcfopexternaservicost?: string | null | undefined;
		idcfopinternaproduto?: string | null | undefined;
		idcfopinternaservico?: string | null | undefined;
		idcfopinternaservicost?: string | null | undefined;
		idmodelnfe?: string | null | undefined;
		idmodelonfse?: string | null | undefined;
		mascaracampochave?: string | null | undefined;
		mostrarcamposfinalizaritem?: number | undefined;
		pedirprimeiroobjeto?: number | undefined;
		tecnicoobrigatorio?: number | undefined;
		camposextras?: CampoExtraOrdemServico[] | undefined;
	};
}): Promise<HttpResponse<ConfiguracaoOrdemServico | null>> {
	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();

	const podeEditar = verificarPermissao(normalizarPerfilArray(params.roles), [
		"proprietario",
		"super",
	]);
	if (!podeEditar) return httpProibido();

	await garantirConfiguracaoOrdemServico(params.idempresa);

	const dadosUpdate: Record<string, unknown> = { ...params.dados };
	if (params.dados.camposextras !== undefined) {
		const validacao = validarCamposExtrasConfigurados(
			params.dados.camposextras,
		);
		if (!validacao.valido) {
			return {
				success: false,
				status: 400,
				error: validacao.erro ?? "Campos extras inválidos",
				code: "VALIDATION_ERROR",
			};
		}
		dadosUpdate.camposextras = validacao.normalizados;
	}

	const atualizado = await atualizarConfiguracaoOrdemServico(
		params.idempresa,
		dadosUpdate,
	);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_configuracao_ordem_servico",
		idusuario: params.idusuario,
		recurso: "configuracao_ordem_servico",
		idrecurso: atualizado?.id ?? params.idempresa,
		idempresa: params.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(params.dados),
		},
	});

	return httpOk(atualizado);
}
