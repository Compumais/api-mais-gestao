import { v4 as uuidv4 } from "uuid";
import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { atualizarContaCorrenteLancamento } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

interface AtualizarContaCorrenteLancamentoServiceParams {
	id: string;
	idusuario: string;
	idempresa: string;
	dados: Partial<NovaContaCorrenteLancamento>;
}

export async function atualizarContaCorrenteLancamentoService({
	id,
	idusuario,
	idempresa,
	dados,
}: AtualizarContaCorrenteLancamentoServiceParams): Promise<
	HttpResponse<ContaCorrenteLancamento | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const lancamentoAtualizado = await atualizarContaCorrenteLancamento({
		id,
		dados,
	});

	if (!lancamentoAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_conta_corrente_lancamento",
		idusuario,
		recurso: "conta_corrente_lancamento",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<ContaCorrenteLancamento>(lancamentoAtualizado);
}
