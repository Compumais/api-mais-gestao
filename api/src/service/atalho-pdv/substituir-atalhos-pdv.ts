import { v4 as uuidv4 } from "uuid";
import type { AtalhoPdvComProduto } from "@/model/atalho-pdv-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarAtalhosPdvComProduto,
	substituirAtalhosPdv,
} from "@/repositories/atalho-pdv-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type SubstituirAtalhosPdvParametros = {
	idusuario: string;
	idempresa: string;
	idsProdutos: string[];
};

type SubstituirAtalhosPdvResposta = {
	data: AtalhoPdvComProduto[];
};

export async function substituirAtalhosPdvService({
	idusuario,
	idempresa,
	idsProdutos,
}: SubstituirAtalhosPdvParametros): Promise<
	HttpResponse<SubstituirAtalhosPdvResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const idsUnicos = [...new Set(idsProdutos.filter(Boolean))];

	await substituirAtalhosPdv({
		idempresa,
		idusuario,
		atalhos: idsUnicos.map((idproduto, index) => ({
			id: uuidv4(),
			idempresa,
			idusuario,
			idproduto,
			ordem: index,
			criadoem: new Date().toISOString(),
		})),
	});

	const atalhos = await listarAtalhosPdvComProduto(idempresa, idusuario);

	return httpOk<SubstituirAtalhosPdvResposta>({
		data: atalhos,
	});
}
