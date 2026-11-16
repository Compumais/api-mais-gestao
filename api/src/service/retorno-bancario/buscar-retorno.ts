import type { HttpResponse } from "@/model/http-model.js";
import type {
	RetornoBancario,
	RetornoBancarioItem,
} from "@/model/retorno-bancario-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarRetornoBancarioPorIdEempresa,
	listarItensRetorno,
} from "@/repositories/retorno-bancario-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarRetornoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function buscarRetornoBancarioService({
	id,
	idempresa,
	idusuario,
}: BuscarRetornoParametros): Promise<
	HttpResponse<{ retorno: RetornoBancario; itens: RetornoBancarioItem[] }>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const retorno = await buscarRetornoBancarioPorIdEempresa(id, idempresa);
	if (!retorno) return httpNaoEncontrado();

	const itens = await listarItensRetorno(id);
	return httpOk({ retorno, itens });
}
