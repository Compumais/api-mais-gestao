import type { HttpResponse } from "@/model/http-model.js";
import type { SaldoEstoque } from "@/model/saldo-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarSaldoEstoquePorId } from "@/repositories/saldo-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarSaldoEstoqueParametros = {
	saldoEstoqueId: number;
	idusuario: string;
};

export async function buscarSaldoEstoqueService({
	saldoEstoqueId,
	idusuario,
}: BuscarSaldoEstoqueParametros): Promise<HttpResponse<SaldoEstoque | null>> {
	const registro = await buscarSaldoEstoquePorId(saldoEstoqueId);

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

	return httpOk<SaldoEstoque>(registro);
}
