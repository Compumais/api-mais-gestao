import type { BandeiraCartao } from "@/model/bandeira-cartao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarBandeiraCartaoPorId } from "@/repositories/bandeira-cartao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarBandeiraCartaoParametros = {
	bandeiraCartaoId: string;
	idusuario: string;
};

export async function buscarBandeiraCartaoService({
	bandeiraCartaoId,
	idusuario,
}: BuscarBandeiraCartaoParametros): Promise<
	HttpResponse<BandeiraCartao | null>
> {
	const registro = await buscarBandeiraCartaoPorId(bandeiraCartaoId);

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

	return httpOk<BandeiraCartao>(registro);
}
