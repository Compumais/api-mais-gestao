import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	excluirNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";
import {
	STATUS_NF_COMPRA_CANCELADA,
	STATUS_RASCUNHO_IMPORTACAO,
} from "@/util/nota-fiscal-constants.js";

type ExcluirNotaFiscalParametros = {
	notaFiscalId: string;
	idusuario: string;
};

export async function excluirNotaFiscalService({
	notaFiscalId,
	idusuario,
}: ExcluirNotaFiscalParametros): Promise<HttpResponse<null>> {
	const registro = await buscarNotaFiscalPorId(notaFiscalId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const ehCompra =
		registro.tipoorigem === 0 || registro.tipoorigem === null;
	const ehRascunho = registro.status === STATUS_RASCUNHO_IMPORTACAO;
	const ehCancelada = registro.status === STATUS_NF_COMPRA_CANCELADA;

	if (ehCompra && !ehRascunho && !ehCancelada) {
		return httpBadRequest(
			"Nota de compra confirmada deve ser cancelada via POST /notas-fiscais/:id/cancelar (estorna estoque/financeiro e apaga a nota)",
		);
	}

	if (ehRascunho) {
		return httpBadRequest(
			"Rascunho de importação deve ser excluído em DELETE /notas-fiscais/rascunhos/:id",
		);
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_nota_fiscal",
		idusuario,
		recurso: "nota_fiscal",
		idrecurso: notaFiscalId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numero: registro.numero,
			status: registro.status,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirNotaFiscal(notaFiscalId);

	return httpSemConteudo();
}
