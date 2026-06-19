import type { CfopDePara } from "@/repositories/cfop-depara-repositories.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCfopDeParaPorId,
	excluirCfopDePara,
} from "@/repositories/cfop-depara-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCfopDeParaParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function excluirCfopDeParaService({
	id,
	idempresa,
	idusuario,
}: ExcluirCfopDeParaParametros): Promise<HttpResponse<CfopDePara | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await buscarCfopDeParaPorId(id);

	if (!registro || registro.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const excluido = await excluirCfopDePara(id);

	if (!excluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
