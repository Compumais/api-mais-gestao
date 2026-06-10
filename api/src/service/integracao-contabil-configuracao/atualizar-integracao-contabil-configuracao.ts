import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	IntegracaoContabilConfiguracao,
	NovoIntegracaoContabilConfiguracao,
} from "@/model/integracao-contabil-configuracao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarIntegracaoContabilConfiguracao,
	buscarIntegracaoContabilConfiguracaoPorId,
} from "@/repositories/integracao-contabil-configuracao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarIntegracaoContabilConfiguracaoParametros = {
	integracaoContabilConfiguracaoId: string;
	idusuario: string;
	dados: Partial<NovoIntegracaoContabilConfiguracao>;
};

export async function atualizarIntegracaoContabilConfiguracaoService({
	integracaoContabilConfiguracaoId,
	idusuario,
	dados,
}: AtualizarIntegracaoContabilConfiguracaoParametros): Promise<
	HttpResponse<IntegracaoContabilConfiguracao | null>
> {
	const registroExistente = await buscarIntegracaoContabilConfiguracaoPorId(
		integracaoContabilConfiguracaoId,
	);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarIntegracaoContabilConfiguracao(
		integracaoContabilConfiguracaoId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_integracao_contabil_configuracao",
		idusuario,
		recurso: "integracao_contabil_configuracao",
		idrecurso: integracaoContabilConfiguracaoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<IntegracaoContabilConfiguracao>(registroAtualizado);
}
