import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import { buscarRemessaBancariaPorId } from "@/repositories/remessa-bancaria-repositories.js";
import { gerarBoletoService } from "@/service/boleto/gerar-boleto.js";
import { incluirTituloRemessaService } from "@/service/remessa-bancaria/incluir-titulo-remessa.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type DadosCobrancaRemessa = {
	instrucaocobrancaboleto?: number | null;
	diasinstrucaocobrancaboleto?: number | null;
	observacaoboleto?: string | null;
	percentualdesconto?: number | null;
};

type GerarRemessaLoteParametros = {
	idempresa: string;
	idusuario: string;
	idcontacorrente: string;
	idsfinanceiros: string[];
	dadosCobranca?: DadosCobrancaRemessa;
};

export type ResultadoGerarRemessaLote = {
	idremessa: string;
	qtdIncluidos: number;
	qtdJaExistiam: number;
	erros: Array<{ idfinanceiro: string; mensagem: string }>;
	nomearquivo: string | null;
};

export async function gerarRemessaLoteService({
	idempresa,
	idusuario,
	idcontacorrente,
	idsfinanceiros,
	dadosCobranca,
}: GerarRemessaLoteParametros): Promise<
	HttpResponse<ResultadoGerarRemessaLote>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const ids = [...new Set(idsfinanceiros.filter(Boolean))];
	if (ids.length === 0) {
		return httpBadRequest("Selecione ao menos um título");
	}

	let idremessa: string | null = null;
	let qtdIncluidos = 0;
	let qtdJaExistiam = 0;
	const erros: Array<{ idfinanceiro: string; mensagem: string }> = [];

	for (const idfinanceiro of ids) {
		const titulo = await buscarFinanceiroPorId(idfinanceiro);
		if (!titulo || titulo.idempresa !== idempresa) {
			erros.push({ idfinanceiro, mensagem: "Título não encontrado" });
			continue;
		}
		if (titulo.tipo !== "R") {
			erros.push({
				idfinanceiro,
				mensagem: "Somente contas a receber podem entrar na remessa",
			});
			continue;
		}
		if (titulo.status !== "A") {
			erros.push({
				idfinanceiro,
				mensagem: "Somente títulos abertos podem entrar na remessa",
			});
			continue;
		}

		if (dadosCobranca) {
			await atualizarFinanceiro(idfinanceiro, {
				instrucaocobrancaboleto:
					dadosCobranca.instrucaocobrancaboleto ??
					titulo.instrucaocobrancaboleto,
				diasinstrucaocobrancaboleto:
					dadosCobranca.diasinstrucaocobrancaboleto ??
					titulo.diasinstrucaocobrancaboleto,
				observacaoboleto:
					dadosCobranca.observacaoboleto ?? titulo.observacaoboleto,
			});
		}

		const boleto = await gerarBoletoService({
			idfinanceiro,
			idcontacorrente,
		});
		if (!boleto.success) {
			erros.push({
				idfinanceiro,
				mensagem: mensagemErroHttp(boleto, "Falha ao gerar boleto"),
			});
			continue;
		}

		const remessa = await incluirTituloRemessaService({
			idempresa,
			idusuario,
			idfinanceiro,
			idcontacorrente,
		});
		if (!remessa.success || !remessa.body) {
			erros.push({
				idfinanceiro,
				mensagem: mensagemErroHttp(remessa, "Falha ao incluir na remessa"),
			});
			continue;
		}

		idremessa = remessa.body.idremessa;
		if (remessa.body.jaExistia) qtdJaExistiam += 1;
		else qtdIncluidos += 1;
	}

	if (!idremessa) {
		return httpBadRequest(
			erros[0]?.mensagem || "Nenhum título foi incluído na remessa",
		);
	}

	const remessa = await buscarRemessaBancariaPorId(idremessa);

	return httpOk({
		idremessa,
		qtdIncluidos,
		qtdJaExistiam,
		erros,
		nomearquivo: remessa?.nomearquivo ?? null,
	});
}
