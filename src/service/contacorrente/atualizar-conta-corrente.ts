import type { ContaCorrente } from "@/model/conta-corrente-model";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	atualizaContaCorrente,
	buscarContaCorrentePorId,
} from "@/repositories/conta-corrente-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

type AtualizarContaCorrenteParametros = {
	contaCorrenteId: string;
	userId: string;
	dados: {
		descricao?: string | null | undefined;
		agencia?: string | null | undefined;
		numeroconta?: string | null | undefined;
		abertura?: string | null | undefined;
		observacao?: string | null | undefined;
		nometitular?: string | null | undefined;
		cnpjcpftitular?: string | null | undefined;
		gerente?: string | null | undefined;
		telefonegerente?: string | null | undefined;
		codigo?: number | null | undefined;
		idbanco?: number | null | undefined;
	};
};

export async function atualizarContaCorrenteService({
	contaCorrenteId,
	userId,
	dados,
}: AtualizarContaCorrenteParametros): Promise<HttpResponse<ContaCorrente | null>> {
	const contaCorrenteExistente = await buscarContaCorrentePorId({
		id: contaCorrenteId,
	});

	if (!contaCorrenteExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		contaCorrenteExistente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contaCorrenteAtualizada = await atualizaContaCorrente({
		id: contaCorrenteId,
		dados,
	});

	if (!contaCorrenteAtualizada) {
		return httpNaoEncontrado();
	}

	return httpOk<ContaCorrente>(contaCorrenteAtualizada);
}

