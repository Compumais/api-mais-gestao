import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarIntegracaoContabilConfiguracaoPorId,
	excluirIntegracaoContabilConfiguracao,
} from "@/repositories/integracao-contabil-configuracao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirIntegracaoContabilConfiguracaoParametros = {
	integracaoContabilConfiguracaoId: string;
	idusuario: string;
};

export async function excluirIntegracaoContabilConfiguracaoService({
	integracaoContabilConfiguracaoId,
	idusuario,
}: ExcluirIntegracaoContabilConfiguracaoParametros): Promise<
	HttpResponse<null>
> {
	const registro = await buscarIntegracaoContabilConfiguracaoPorId(
		integracaoContabilConfiguracaoId,
	);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_integracao_contabil_configuracao",
		idusuario,
		recurso: "integracao_contabil_configuracao",
		idrecurso: integracaoContabilConfiguracaoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			id: registro.id,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirIntegracaoContabilConfiguracao(integracaoContabilConfiguracaoId);

	return httpSemConteudo();
}
