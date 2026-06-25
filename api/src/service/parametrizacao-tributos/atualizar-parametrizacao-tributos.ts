import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import {
	atualizarParametrizacaoTributos,
	buscarParametrizacaoTributosDuplicada,
	buscarParametrizacaoTributosPorId,
	type ParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import type { DadosParametrizacaoTributos } from "@/service/parametrizacao-tributos/criar-parametrizacao-tributos.js";
import {
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type AtualizarParametrizacaoTributosParametros = {
	id: string;
	idusuario: string;
	dados: DadosParametrizacaoTributos & { idempresa: string };
};

export async function atualizarParametrizacaoTributosService({
	id,
	idusuario,
	dados,
}: AtualizarParametrizacaoTributosParametros): Promise<
	HttpResponse<ParametrizacaoTributos | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const atual = await buscarParametrizacaoTributosPorId(id);

	if (!atual || atual.idempresa !== dados.idempresa) {
		return httpNaoEncontrado();
	}

	if (dados.idcfopsaidanfe) {
		const cfop = await buscarCfopPorId(dados.idcfopsaidanfe);
		if (!cfop || cfop.idempresa !== dados.idempresa) return httpErro();
	}

	if (dados.idcfopsaidanfce) {
		const cfop = await buscarCfopPorId(dados.idcfopsaidanfce);
		if (!cfop || cfop.idempresa !== dados.idempresa) return httpErro();
	}

	const duplicado = await buscarParametrizacaoTributosDuplicada(
		dados.idempresa,
		dados.codigocfopentrada ?? "",
		dados.cstentrada,
		dados.csosnentrada,
		dados.ncm,
		dados.uf,
		id,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const registro = await atualizarParametrizacaoTributos(id, dados);

	if (!registro) {
		return httpNaoEncontrado();
	}

	return httpOk<ParametrizacaoTributos>(registro);
}
