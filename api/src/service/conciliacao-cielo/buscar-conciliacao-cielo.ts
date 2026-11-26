import type { HttpResponse } from "@/model/http-model.js";
import type {
	ConciliacaoCielo,
	ConciliacaoCieloItem,
} from "@/model/conciliacao-cielo-model.js";
import {
	buscarConciliacaoCieloPorIdEempresa,
	listarItensConciliacaoCielo,
} from "@/repositories/conciliacao-cielo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export type ItemConciliacaoCieloDetalhe = ConciliacaoCieloItem & {
	documento: string | null;
	historico: string | null;
	valorfinanceiro: string | null;
	saldofinanceiro: string | null;
	statusfinanceiro: string | null;
	nomecliente: string | null;
};

export async function buscarConciliacaoCieloService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
}): Promise<
	HttpResponse<{
		conciliacao: ConciliacaoCielo;
		itens: ItemConciliacaoCieloDetalhe[];
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const conciliacao = await buscarConciliacaoCieloPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!conciliacao) return httpNaoEncontrado("Conciliação não encontrada");

	const itens = await listarItensConciliacaoCielo(conciliacao.id);
	return httpOk({
		conciliacao,
		itens: itens.map((registro) => ({
			...registro.item,
			documento: registro.documento,
			historico: registro.historico,
			valorfinanceiro: registro.valorfinanceiro,
			saldofinanceiro: registro.saldofinanceiro,
			statusfinanceiro: registro.statusfinanceiro,
			nomecliente: registro.razaosocial?.trim() || registro.nomecliente,
		})),
	});
}
