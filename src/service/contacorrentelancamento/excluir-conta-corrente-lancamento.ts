import { v4 as uuidv4 } from "uuid";
import {
	buscarLancamentoContaCorrentePorId,
	excluirContaCorrenteLancamento,
} from "@/repositories/conta-corrente-lancamento-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

interface ExcluirContaCOrrenteLancamentoServiceParams {
	id: string;
	idusuario: string;
	idempresa: string;
}

export async function excluirContaCorrenteLancamentoService({
	id,
	idusuario,
	idempresa,
}: ExcluirContaCOrrenteLancamentoServiceParams) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const lancamento = await buscarLancamentoContaCorrentePorId({ id });

	if (!lancamento) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_conta_corrente_lancamento",
		idusuario,
		recurso: "conta_corrente_lancamento",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idcontacorrente: lancamento.idcontacorrente,
			tipo: lancamento.tipo,
			valor: lancamento.valor?.toString(),
			saldoanterior: lancamento.saldoanterior?.toString(),
			saldoatual: lancamento.saldoatual?.toString(),
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirContaCorrenteLancamento({ id });

	return httpSemConteudo();
}
