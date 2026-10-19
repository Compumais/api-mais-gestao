import type { AtalhoPdvComProduto } from "@/model/atalho-pdv-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarAtalhosPdvComProduto } from "@/repositories/atalho-pdv-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { preencherSiglaUnidade } from "@/service/produto/preencher-sigla-unidade.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarAtalhosPdvParametros = {
	idusuario: string;
	idempresa: string;
};

type ListarAtalhosPdvResposta = {
	data: AtalhoPdvComProduto[];
};

export async function listarAtalhosPdvService({
	idusuario,
	idempresa,
}: ListarAtalhosPdvParametros): Promise<HttpResponse<ListarAtalhosPdvResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const atalhos = await preencherSiglaUnidade(
		idempresa,
		await listarAtalhosPdvComProduto(idempresa, idusuario),
	);

	return httpOk<ListarAtalhosPdvResposta>({
		data: atalhos,
	});
}
