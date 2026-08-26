import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { gerarArquivoEfdIcms } from "@/service/efd-icms/gerar-efd-icms.js";
import type {
	FinalidadeEfd,
	GerarEfdIcmsParametros,
} from "@/service/efd-icms/tipos-efd-icms.js";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

export type GerarEfdIcmsServiceParametros = GerarEfdIcmsParametros & {
	idusuario: string;
};

export type GerarEfdServiceResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
	alertas: string[];
	totalLinhas: number;
};

export async function gerarEfdIcmsService({
	idusuario,
	idempresa,
	dataInicio,
	dataFim,
	finalidade,
	incluirInventario,
	dataInventario,
}: GerarEfdIcmsServiceParametros): Promise<
	HttpResponse<GerarEfdServiceResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroPeriodo = validarPeriodoEfd(dataInicio, dataFim);
	if (erroPeriodo) {
		return httpBadRequest(erroPeriodo);
	}

	if (incluirInventario && !dataInventario) {
		return httpBadRequest(
			"Informe a data do inventário quando incluir inventário fiscal.",
		);
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		return httpBadRequest("Empresa não encontrada.");
	}

	try {
		const resultado = await gerarArquivoEfdIcms({
			idempresa,
			dataInicio,
			dataFim,
			finalidade: (finalidade ?? "0") as FinalidadeEfd,
			incluirInventario,
			dataInventario,
		});

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
				: "Erro ao gerar arquivo EFD ICMS/IPI";
		return httpBadRequest(mensagem);
	}
}
