import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import {
	buscarParametrizacaoTributosDuplicada,
	criarParametrizacaoTributos,
	type NovaParametrizacaoTributos,
	type ParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

export type DadosParametrizacaoTributos = Omit<
	NovaParametrizacaoTributos,
	"id" | "inativo"
>;

type CriarParametrizacaoTributosParametros = {
	dados: DadosParametrizacaoTributos & { id: string };
	idusuario: string;
};

async function validarCfopsSaida(
	idempresa: string,
	idcfopsaidanfe?: string | null,
	idcfopsaidanfce?: string | null,
) {
	if (idcfopsaidanfe) {
		const cfop = await buscarCfopPorId(idcfopsaidanfe);
		if (!cfop || cfop.idempresa !== idempresa) return false;
	}

	if (idcfopsaidanfce) {
		const cfop = await buscarCfopPorId(idcfopsaidanfce);
		if (!cfop || cfop.idempresa !== idempresa) return false;
	}

	return true;
}

export async function criarParametrizacaoTributosService({
	dados,
	idusuario,
}: CriarParametrizacaoTributosParametros): Promise<
	HttpResponse<ParametrizacaoTributos | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!dados.codigocfopentrada) {
		return httpErro();
	}

	const cfopsValidos = await validarCfopsSaida(
		dados.idempresa,
		dados.idcfopsaidanfe,
		dados.idcfopsaidanfce,
	);

	if (!cfopsValidos) {
		return httpErro();
	}

	const duplicado = await buscarParametrizacaoTributosDuplicada(
		dados.idempresa,
		dados.codigocfopentrada,
		dados.cstentrada,
		dados.csosnentrada,
		dados.ncm,
		dados.uf,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const registro = await criarParametrizacaoTributos({
		...dados,
		inativo: 0,
	});

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<ParametrizacaoTributos>(registro);
}
