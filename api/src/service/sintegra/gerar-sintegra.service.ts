import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { gerarArquivoSintegra } from "@/service/sintegra/gerar-sintegra.js";
import type {
	FinalidadeSintegra,
	GerarSintegraParametros,
} from "@/service/sintegra/tipos-sintegra.js";
import { validarPeriodo } from "@/service/sintegra/validar-sintegra.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

export type GerarSintegraServiceParametros = GerarSintegraParametros & {
	idusuario: string;
};

export type GerarSintegraServiceResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
	alertas: string[];
	totalLinhas: number;
};

export async function gerarSintegraService({
	idusuario,
	idempresa,
	dataInicio,
	dataFim,
	finalidade,
	incluirInventario,
	dataInventario,
}: GerarSintegraServiceParametros): Promise<
	HttpResponse<GerarSintegraServiceResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroPeriodo = validarPeriodo(dataInicio, dataFim);
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
		const resultado = await gerarArquivoSintegra({
			idempresa,
			dataInicio,
			dataFim,
			finalidade: (finalidade ?? "1") as FinalidadeSintegra,
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
			error instanceof Error ? error.message : "Erro ao gerar arquivo SINTEGRA";
		return httpBadRequest(mensagem);
	}
}
