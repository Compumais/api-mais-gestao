import type { HttpResponse } from "@/model/http-model.js";
import {
	enviarEmailService,
	type ResultadoEnvioEmail,
} from "@/service/email/enviar-email.js";

type TestarSmtpParametros = {
	idusuario: string;
	idempresa: string;
	destinatario: string;
};

export async function testarSmtpService({
	idusuario,
	idempresa,
	destinatario,
}: TestarSmtpParametros): Promise<HttpResponse<ResultadoEnvioEmail>> {
	return enviarEmailService({
		idusuario,
		idempresa,
		destinatario,
		assunto: "Teste de SMTP — Mais Gestão",
		texto:
			"Este é um e-mail de teste da configuração SMTP do Mais Gestão. Se você recebeu esta mensagem, o envio está funcionando.",
		html: `<p>Este é um e-mail de teste da configuração SMTP do <strong>Mais Gestão</strong>.</p><p>Se você recebeu esta mensagem, o envio está funcionando.</p>`,
	});
}
