import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarLocacoesAbertasParaMapa } from "@/repositories/locacao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type EquipamentoNoMapa = {
	codigo: string;
	descricao: string;
	numeroserie: string | null;
};

export type LocacaoNoMapa = {
	id: string;
	codigo: string;
	nomecliente: string;
	endereco: string | null;
	numeroendereco: string | null;
	bairro: string | null;
	cep: string | null;
	latitude: string | null;
	longitude: string | null;
	equipamentos: EquipamentoNoMapa[];
};

export async function listarMapaLocacoesService(parametros: {
	idempresa: string;
	idusuario: string;
}): Promise<
	HttpResponse<{
		comPonto: LocacaoNoMapa[];
		semPonto: LocacaoNoMapa[];
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const registros = await listarLocacoesAbertasParaMapa(parametros.idempresa);
	const locacoes = registros.map((registro) => ({
		id: registro.locacao.id,
		codigo: registro.locacao.codigo,
		nomecliente: registro.razaosocial?.trim() || registro.nomecliente,
		endereco: registro.locacao.endereco,
		numeroendereco: registro.locacao.numeroendereco,
		bairro: registro.locacao.bairro,
		cep: registro.locacao.cep,
		latitude: registro.locacao.latitude,
		longitude: registro.locacao.longitude,
		equipamentos: registro.equipamentos.map((item) => ({
			codigo: item.codigoequipamento,
			descricao: item.descricaoequipamento,
			numeroserie: item.numeroserie,
		})),
	}));

	return httpOk({
		comPonto: locacoes.filter((item) => item.latitude && item.longitude),
		semPonto: locacoes.filter((item) => !item.latitude || !item.longitude),
	});
}
