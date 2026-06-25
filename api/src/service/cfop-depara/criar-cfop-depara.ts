import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCfopPorId,
} from "@/repositories/cfop-repositories.js";
import {
	buscarCfopDeParaDuplicado,
	criarCfopDePara,
	type CfopDePara,
	type NovoCfopDePara,
} from "@/repositories/cfop-depara-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type CriarCfopDeParaParametros = {
	dados: Omit<NovoCfopDePara, "codigoentrada" | "codigosaida" | "inativo">;
	idusuario: string;
};

export async function criarCfopDeParaService({
	dados,
	idusuario,
}: CriarCfopDeParaParametros): Promise<HttpResponse<CfopDePara | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!dados.idcfopentrada || !dados.idcfopsaida) {
		return httpErro();
	}

	const [cfopEntrada, cfopSaida] = await Promise.all([
		buscarCfopPorId(dados.idcfopentrada),
		buscarCfopPorId(dados.idcfopsaida),
	]);

	if (
		!cfopEntrada ||
		!cfopSaida ||
		cfopEntrada.idempresa !== dados.idempresa ||
		cfopSaida.idempresa !== dados.idempresa
	) {
		return httpErro();
	}

	const ufNormalizada = dados.uf?.trim().toUpperCase() || null;
	const duplicado = await buscarCfopDeParaDuplicado(
		dados.idempresa,
		dados.idcfopentrada,
		ufNormalizada,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const registro = await criarCfopDePara({
		...dados,
		codigoentrada: cfopEntrada.codigo ?? null,
		codigosaida: cfopSaida.codigo ?? null,
		inativo: 0,
	} satisfies NovoCfopDePara);

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<CfopDePara>(registro);
}
