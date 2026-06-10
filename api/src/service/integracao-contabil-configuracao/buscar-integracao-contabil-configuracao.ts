import type { IntegracaoContabilConfiguracao } from "@/model/integracao-contabil-configuracao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarIntegracaoContabilConfiguracaoPorId } from "@/repositories/integracao-contabil-configuracao-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarIntegracaoContabilConfiguracaoParametros = {
	integracaoContabilConfiguracaoId: string;
	idusuario: string;
};

export async function buscarIntegracaoContabilConfiguracaoService({
	integracaoContabilConfiguracaoId,
	idusuario,
}: BuscarIntegracaoContabilConfiguracaoParametros): Promise<
	HttpResponse<IntegracaoContabilConfiguracao | null>
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

	return httpOk<IntegracaoContabilConfiguracao>(registro);
}
