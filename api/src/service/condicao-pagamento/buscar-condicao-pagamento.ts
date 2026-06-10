import type { CondicaoPagamento } from "@/model/condicao-pagamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCondicaoPagamentoParametros = {
	condicaoPagamentoId: string;
	idusuario: string;
};

export async function buscarCondicaoPagamentoService({
	condicaoPagamentoId,
	idusuario,
}: BuscarCondicaoPagamentoParametros): Promise<
	HttpResponse<CondicaoPagamento | null>
> {
	const registro = await buscarCondicaoPagamentoPorId(condicaoPagamentoId);

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

	return httpOk<CondicaoPagamento>(registro);
}
