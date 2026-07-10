import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoEmailSmtpPorEmpresa } from "@/repositories/configuracao-email-smtp-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type ConfiguracaoEmailSmtpPublica = {
	id: string;
	idempresa: string;
	host: string;
	porta: number;
	seguro: boolean;
	usuario: string;
	emailremetente: string;
	nomremetente: string | null;
	ativo: boolean;
	senhaConfigurada: boolean;
	criadoem: string;
	atualizadoem: string;
};

type BuscarConfiguracaoSmtpParametros = {
	idusuario: string;
	idempresa: string;
};

export async function buscarConfiguracaoSmtpService({
	idusuario,
	idempresa,
}: BuscarConfiguracaoSmtpParametros): Promise<
	HttpResponse<ConfiguracaoEmailSmtpPublica | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await buscarConfiguracaoEmailSmtpPorEmpresa(idempresa);

	if (!registro) {
		return httpOk(null);
	}

	return httpOk({
		id: registro.id,
		idempresa: registro.idempresa,
		host: registro.host,
		porta: registro.porta,
		seguro: registro.seguro,
		usuario: registro.usuario,
		emailremetente: registro.emailremetente,
		nomremetente: registro.nomremetente,
		ativo: registro.ativo,
		senhaConfigurada: !!registro.senha,
		criadoem: registro.criadoem,
		atualizadoem: registro.atualizadoem,
	});
}

export async function buscarConfiguracaoSmtpAtivaInterna(idempresa: string) {
	const registro = await buscarConfiguracaoEmailSmtpPorEmpresa(idempresa);
	if (!registro || !registro.ativo) {
		return null;
	}
	return registro;
}
