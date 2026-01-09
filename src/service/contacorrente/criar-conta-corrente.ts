import type {
	ContaCorrente,
	NovaContaCorrente,
} from "@/model/conta-corrente-model";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import { criarContaCorrente } from "@/repositories/conta-corrente-repositories";
import { httpCriacao, httpErroInterno, httpProibido } from "@/util/http-util";

type CriarContaCorrenteParametros = {
	usuarioId: string;
	dadosContaCorrente: NovaContaCorrente;
};

export async function criarContaCorrenteService({
	usuarioId,
	dadosContaCorrente,
}: CriarContaCorrenteParametros): Promise<HttpResponse<ContaCorrente>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		dadosContaCorrente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contaCorrente = await criarContaCorrente(dadosContaCorrente);

	if (!contaCorrente) {
		return httpErroInterno();
	}

	return httpCriacao(contaCorrente);
}
