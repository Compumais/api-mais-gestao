import type { HttpResponse } from "@/model/http-model.js";
import type { Locacao, LocacaoItem } from "@/model/locacao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocacaoPorIdEempresa,
	listarItensLocacao,
} from "@/repositories/locacao-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export type LocacaoDetalhe = Locacao & {
	nomecliente: string;
	itens: Array<
		LocacaoItem & {
			codigoequipamento: string;
			descricaoequipamento: string;
			numeroserie: string | null;
		}
	>;
};

export async function buscarLocacaoService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<LocacaoDetalhe | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const registro = await buscarLocacaoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!registro) return httpNaoEncontrado("Locação não encontrada");

	const itens = await listarItensLocacao(registro.locacao.id);
	return httpOk({
		...registro.locacao,
		nomecliente: registro.razaosocial?.trim() || registro.nomecliente,
		itens: itens.map((item) => ({
			...item.item,
			codigoequipamento: item.codigoequipamento,
			descricaoequipamento: item.descricaoequipamento,
			numeroserie: item.numeroserie,
		})),
	});
}
