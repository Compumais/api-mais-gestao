import { v4 as uuidv4 } from "uuid";
import type {
	IntegracaoContabilConfiguracao,
	NovoIntegracaoContabilConfiguracao,
} from "@/model/integracao-contabil-configuracao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarIntegracaoContabilConfiguracao,
	excluirIntegracaoContabilConfiguracao,
} from "@/repositories/integracao-contabil-configuracao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarIntegracaoContabilConfiguracaoParametros = {
	dadosIntegracaoContabilConfiguracao: NovoIntegracaoContabilConfiguracao;
	idusuario: string;
};

export async function criarIntegracaoContabilConfiguracaoService({
	dadosIntegracaoContabilConfiguracao,
	idusuario,
}: CriarIntegracaoContabilConfiguracaoParametros): Promise<
	HttpResponse<IntegracaoContabilConfiguracao | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosIntegracaoContabilConfiguracao.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarIntegracaoContabilConfiguracao(
		dadosIntegracaoContabilConfiguracao,
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_integracao_contabil_configuracao",
		idusuario,
		recurso: "integracao_contabil_configuracao",
		idrecurso: registro.id,
		idempresa: dadosIntegracaoContabilConfiguracao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			id: registro.id,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirIntegracaoContabilConfiguracao(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<IntegracaoContabilConfiguracao>(registro);
}
