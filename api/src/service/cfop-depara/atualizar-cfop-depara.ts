import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import {
	atualizarCfopDePara,
	buscarCfopDeParaDuplicado,
	buscarCfopDeParaPorId,
	type CfopDePara,
} from "@/repositories/cfop-depara-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type AtualizarCfopDeParaParametros = {
	id: string;
	idusuario: string;
	dados: {
		idempresa: string;
		idcfopentrada: string;
		idcfopsaida: string;
		uf?: string | null | undefined;
	};
};

export async function atualizarCfopDeParaService({
	id,
	idusuario,
	dados,
}: AtualizarCfopDeParaParametros): Promise<HttpResponse<CfopDePara | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtual = await buscarCfopDeParaPorId(id);

	if (!registroAtual || registroAtual.idempresa !== dados.idempresa) {
		return httpNaoEncontrado();
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
		id,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const registro = await atualizarCfopDePara(id, {
		idcfopentrada: dados.idcfopentrada,
		idcfopsaida: dados.idcfopsaida,
		codigoentrada: cfopEntrada.codigo ?? null,
		codigosaida: cfopSaida.codigo ?? null,
		uf: ufNormalizada,
	});

	if (!registro) {
		return httpNaoEncontrado();
	}

	return httpOk<CfopDePara>(registro);
}
