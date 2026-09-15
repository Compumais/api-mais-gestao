import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { gerarArquivoEfdContribuicoes } from "@/service/efd-contribuicoes/gerar-efd-contribuicoes.js";
import type { GerarEfdServiceResposta } from "@/service/efd-icms/gerar-efd-icms.service.js";
import type { GerarEfdIcmsParametros } from "@/service/efd-icms/tipos-efd-icms.js";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

export async function gerarEfdContribuicoesService(
	params: GerarEfdIcmsParametros & { idusuario: string },
): Promise<HttpResponse<GerarEfdServiceResposta>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	const erroPeriodo = validarPeriodoEfd(params.dataInicio, params.dataFim);
	if (erroPeriodo) return httpBadRequest(erroPeriodo);

	try {
		const resultado = await gerarArquivoEfdContribuicoes(params);
		return httpOk({
			content: Buffer.from(resultado.conteudo, "utf-8"),
			contentType: "text/plain; charset=utf-8",
			filename: resultado.filename,
			alertas: resultado.alertas,
			totalLinhas: resultado.totalLinhas,
		});
	} catch (error) {
		const mensagem =
			error instanceof Error
				? error.message
				: "Erro ao gerar EFD-Contribuições";
		return httpBadRequest(mensagem);
	}
}
