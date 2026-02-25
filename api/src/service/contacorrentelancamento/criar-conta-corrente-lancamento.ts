import { v4 as uuidv4 } from "uuid";
import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarUltimoLancamentoContaCorrente,
	criarContaCorrenteLancamento,
	excluirContaCorrenteLancamento,
} from "@/repositories/conta-corrente-lancamento-repositories.js";
import { verificarContaCorrentePertenceEmpresa } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
} from "@/util/http-util.js";

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

	if (!contaCorrenteLancamento) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_conta_corrente_lancamento",
		idusuario: usuarioId,
		recurso: "conta_corrente_lancamento",
		idrecurso: contaCorrenteLancamento.id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idcontacorrente: dados.idcontacorrente,
			tipo: tipoLancamento,
			valor: valorLancamento.toString(),
			saldoanterior: saldoAnterior.toString(),
			saldoatual: saldoAtual.toString(),
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirContaCorrenteLancamento({ id: contaCorrenteLancamento.id });
		return httpErroInterno();
	}

	return httpCriacao(contaCorrenteLancamento);
}
