import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarProximoCodigoBanco,
	buscarProximoCodigoCondicaoPagamento,
	buscarProximoCodigoContaCorrente,
	buscarProximoCodigoHierarquia,
	buscarProximoCodigoProduto,
	buscarProximoCodigoUnidadeMedida,
} from "@/repositories/proximo-codigo-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type BuscarProximoCodigoParametros = {
	idusuario: string;
	idempresa: string;
	recurso:
		| "produto"
		| "hierarquia"
		| "banco"
		| "unidade-medida"
		| "conta-corrente"
		| "condicao-pagamento";
};

type RespostaNumerica = { codigo: number };
type RespostaTexto = { codigo: string };

export async function buscarProximoCodigoService({
	idusuario,
	idempresa,
	recurso,
}: BuscarProximoCodigoParametros): Promise<
	HttpResponse<RespostaNumerica | RespostaTexto>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	switch (recurso) {
		case "produto": {
			const codigo = await buscarProximoCodigoProduto(idempresa);
			return httpOk({ codigo });
		}
		case "hierarquia": {
			const codigo = await buscarProximoCodigoHierarquia(idempresa);
			return httpOk({ codigo });
		}
		case "banco": {
			const codigo = await buscarProximoCodigoBanco(idempresa);
			return httpOk({ codigo });
		}
		case "unidade-medida": {
			const codigo = await buscarProximoCodigoUnidadeMedida(idempresa);
			return httpOk({ codigo });
		}
		case "conta-corrente": {
			const codigo = await buscarProximoCodigoContaCorrente(idempresa);
			return httpOk({ codigo });
		}
		case "condicao-pagamento": {
			const codigo = await buscarProximoCodigoCondicaoPagamento(idempresa);
			return httpOk({ codigo });
		}
		default:
			return httpProibido();
	}
}
