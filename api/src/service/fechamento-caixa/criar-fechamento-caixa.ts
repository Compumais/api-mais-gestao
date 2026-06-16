import type {
	FechamentoCaixa,
	NovoFechamentoCaixa,
} from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarFechamentoCaixa } from "@/repositories/fechamento-caixa-repositories.js";
import { httpCriacao, httpErro, httpProibido } from "@/util/http-util.js";

type CriarFechamentoCaixaParametros = {
	dadosFechamentoCaixa: NovoFechamentoCaixa;
	idusuario: string;
};

export async function criarFechamentoCaixaService({
	dadosFechamentoCaixa,
	idusuario,
}: CriarFechamentoCaixaParametros): Promise<
	HttpResponse<FechamentoCaixa | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosFechamentoCaixa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarFechamentoCaixa(dadosFechamentoCaixa);

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<FechamentoCaixa>(registro);
}
