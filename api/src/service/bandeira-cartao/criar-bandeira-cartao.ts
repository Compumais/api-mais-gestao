import { v4 as uuidv4 } from "uuid";
import type {
	BandeiraCartao,
	NovaBandeiraCartao,
} from "@/model/bandeira-cartao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarBandeiraCartao,
	excluirBandeiraCartao,
} from "@/repositories/bandeira-cartao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarBandeiraCartaoParametros = {
	dadosBandeiraCartao: NovaBandeiraCartao;
	idusuario: string;
};

export async function criarBandeiraCartaoService({
	dadosBandeiraCartao,
	idusuario,
}: CriarBandeiraCartaoParametros): Promise<
	HttpResponse<BandeiraCartao | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosBandeiraCartao.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarBandeiraCartao(dadosBandeiraCartao);

	if (!registro) {
		return httpErro();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_bandeira_cartao",
		idusuario,
		recurso: "bandeira_cartao",
		idrecurso: registro.id,
		idempresa: dadosBandeiraCartao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
			inativo: registro.inativo,
		},
	});

	if (!auditoria?.success) {
		await excluirBandeiraCartao(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<BandeiraCartao>(registro);
}
