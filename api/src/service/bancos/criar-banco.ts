import type { Banco, NovoBanco } from "@/model/banco-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarBanco } from "@/repositories/banco-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarBancoParametros = {
	idusuario: string;
	dadosBanco: Omit<NovoBanco, "currenttimemillis">;
};

export async function criarBancoService({
	idusuario,
	dadosBanco,
}: CriarBancoParametros): Promise<HttpResponse<Banco>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosBanco.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const banco = await criarBanco({
		...dadosBanco,
		currenttimemillis: Date.now(),
	});

	if (!banco) {
		return httpErroInterno();
	}

	return httpCriacao<Banco>(banco);
}
