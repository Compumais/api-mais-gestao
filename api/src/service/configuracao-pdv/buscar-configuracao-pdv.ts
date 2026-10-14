import type { ConfiguracaoPdvResposta } from "@/model/configuracao-pdv-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoPdvPorEmpresa } from "@/repositories/configuracao-pdv-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { paraResposta } from "./mapear-configuracao-pdv.js";

type BuscarConfiguracaoPdvParametros = {
	idusuario: string;
	idempresa: string;
};

export async function buscarConfiguracaoPdvService({
	idusuario,
	idempresa,
}: BuscarConfiguracaoPdvParametros): Promise<
	HttpResponse<ConfiguracaoPdvResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const configuracao = await buscarConfiguracaoPdvPorEmpresa(idempresa);
	return httpOk(paraResposta(configuracao));
}
