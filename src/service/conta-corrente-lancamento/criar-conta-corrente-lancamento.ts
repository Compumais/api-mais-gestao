import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarUltimoLancamentoContaCorrente,
	criarContaCorrenteLancamento,
} from "@/repositories/conta-corrente-lancamento-repositories";
import { verificarContaCorrentePertenceEmpresa } from "@/repositories/conta-corrente-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	httpCriacao,
	httpErro,
	httpNaoAutorizado,
	httpNaoEncontrado,
} from "@/util/http-util";

export async function criarContaCorrenteLancamentoService(
	dados: NovaContaCorrenteLancamento,
	usuarioId: string,
	idempresa: string,
): Promise<HttpResponse<ContaCorrenteLancamento>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	if (!dados.idcontacorrente) {
		return httpErro();
	}

	const contaCorrentePertenceEmpresa =
		await verificarContaCorrentePertenceEmpresa({
			idcontacorrente: dados.idcontacorrente,
			idempresa,
		});

	if (!contaCorrentePertenceEmpresa) {
		return httpNaoEncontrado();
	}

	if (dados.tipo && dados.tipo !== "C" && dados.tipo !== "D") {
		return httpErro();
	}

	if (!dados.valor || Number(dados.valor) <= 0) {
		return httpErro();
	}

	const ultimoLancamento = await buscarUltimoLancamentoContaCorrente({
		idcontacorrente: dados.idcontacorrente,
	});

	const saldoAnterior = ultimoLancamento?.saldoatual
		? Number(ultimoLancamento.saldoatual)
		: 0;

	const valorLancamento = Number(dados.valor);
	const tipoLancamento = dados.tipo || "C";

	const saldoAtual =
		tipoLancamento === "C"
			? saldoAnterior + valorLancamento
			: saldoAnterior - valorLancamento;

	const contaCorrenteLancamento = await criarContaCorrenteLancamento({
		idusuario: usuarioId,
		saldoanterior: saldoAnterior.toString(),
		saldoatual: saldoAtual.toString(),
		...dados,
	});

	return httpCriacao(contaCorrenteLancamento);
}
