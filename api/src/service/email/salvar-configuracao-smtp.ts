import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarConfiguracaoEmailSmtp,
	buscarConfiguracaoEmailSmtpPorEmpresa,
	criarConfiguracaoEmailSmtp,
} from "@/repositories/configuracao-email-smtp-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ConfiguracaoEmailSmtpPublica,
} from "@/service/email/buscar-configuracao-smtp.js";
import { criptografarTexto } from "@/util/criptografia-certificado.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type SalvarConfiguracaoSmtpParametros = {
	idusuario: string;
	idempresa: string;
	host: string;
	porta: number;
	seguro: boolean;
	usuario: string;
	senha?: string | undefined;
	emailremetente: string;
	nomremetente?: string | null | undefined;
	ativo: boolean;
};

function paraPublica(
	registro: NonNullable<
		Awaited<ReturnType<typeof buscarConfiguracaoEmailSmtpPorEmpresa>>
	>,
): ConfiguracaoEmailSmtpPublica {
	return {
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
	};
}

export async function salvarConfiguracaoSmtpService({
	idusuario,
	idempresa,
	host,
	porta,
	seguro,
	usuario,
	senha,
	emailremetente,
	nomremetente,
	ativo,
}: SalvarConfiguracaoSmtpParametros): Promise<
	HttpResponse<ConfiguracaoEmailSmtpPublica>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const hostTrim = host.trim();
	const usuarioTrim = usuario.trim();
	const emailTrim = emailremetente.trim();

	if (!hostTrim || !usuarioTrim || !emailTrim) {
		return httpBadRequest("Host, usuário e e-mail remetente são obrigatórios");
	}

	if (!Number.isFinite(porta) || porta < 1 || porta > 65535) {
		return httpBadRequest("Porta SMTP inválida");
	}

	const existente = await buscarConfiguracaoEmailSmtpPorEmpresa(idempresa);
	const agora = new Date().toISOString();
	const senhaTrim = senha?.trim();

	if (!existente && !senhaTrim) {
		return httpBadRequest("Informe a senha SMTP na primeira configuração");
	}

	if (existente) {
		const atualizado = await atualizarConfiguracaoEmailSmtp(existente.id, {
			host: hostTrim,
			porta,
			seguro,
			usuario: usuarioTrim,
			emailremetente: emailTrim,
			nomremetente: nomremetente?.trim() || null,
			ativo,
			atualizadoem: agora,
			...(senhaTrim ? { senha: criptografarTexto(senhaTrim) } : {}),
		});

		if (!atualizado) {
			return httpBadRequest("Não foi possível atualizar a configuração SMTP");
		}

		return httpOk(paraPublica(atualizado));
	}

	const criado = await criarConfiguracaoEmailSmtp({
		id: uuidv4(),
		idempresa,
		host: hostTrim,
		porta,
		seguro,
		usuario: usuarioTrim,
		senha: criptografarTexto(senhaTrim as string),
		emailremetente: emailTrim,
		nomremetente: nomremetente?.trim() || null,
		ativo,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!criado) {
		return httpBadRequest("Não foi possível salvar a configuração SMTP");
	}

	return httpOk(paraPublica(criado));
}
