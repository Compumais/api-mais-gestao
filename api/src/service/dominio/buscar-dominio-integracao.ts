import type { DominioIntegracaoPublica } from "@/model/dominio-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDominioIntegracaoPorEmpresa } from "@/repositories/dominio-integracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { descriptografarTexto } from "@/util/criptografia-certificado.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { mapearDominioIntegracaoPublica } from "@/util/mascarar-chave-dominio.js";

type BuscarDominioIntegracaoParametros = {
	idusuario: string;
	idempresa: string;
};

function descriptografarSePossivel(valor: string | null): string | null {
	if (!valor) return null;
	try {
		return descriptografarTexto(valor);
	} catch {
		return null;
	}
}

export async function buscarDominioIntegracaoService({
	idusuario,
	idempresa,
}: BuscarDominioIntegracaoParametros): Promise<
	HttpResponse<DominioIntegracaoPublica | null>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const registro = await buscarDominioIntegracaoPorEmpresa(idempresa);
	if (!registro) {
		return httpOk(null);
	}

	const chavePlano = descriptografarSePossivel(registro.chavecontador);
	return httpOk(mapearDominioIntegracaoPublica(registro, chavePlano));
}
