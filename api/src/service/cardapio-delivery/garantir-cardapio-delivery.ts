import { v4 as uuidv4 } from "uuid";
import type { CardapioDelivery } from "@/model/cardapio-delivery-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	buscarCardapioDeliveryPorEmpresa,
	criarCardapioDelivery,
	slugCardapioEmUso,
} from "@/repositories/cardapio-delivery-repositories.js";
import { CAMPOS_FINALIZACAO_PADRAO, HORARIO_PADRAO } from "@/util/cardapio-delivery-padrao.js";
import { gerarSlugCardapio } from "@/util/cardapio-delivery-identidade.js";
import { httpOk, httpProibido, httpNaoEncontrado } from "@/util/http-util.js";

type GarantirCardapioDeliveryParametros = {
	idempresa: string;
	idusuario: string;
};

async function slugDisponivel(base: string): Promise<string> {
	let slug = base;
	let tentativa = 0;
	while (await slugCardapioEmUso(slug)) {
		tentativa += 1;
		slug = `${base}-${tentativa}`.slice(0, 80);
	}
	return slug;
}

export async function garantirCardapioDeliveryService({
	idempresa,
	idusuario,
}: GarantirCardapioDeliveryParametros): Promise<
	HttpResponse<CardapioDelivery | null>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const existente = await buscarCardapioDeliveryPorEmpresa(idempresa);
	if (existente) return httpOk(existente);

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) return httpNaoEncontrado("Empresa não encontrada");

	const slug = await slugDisponivel(gerarSlugCardapio(empresa.nome));
	const agora = new Date().toISOString();
	const criado = await criarCardapioDelivery({
		id: uuidv4(),
		idempresa,
		slug,
		ativo: 0,
		corprimaria: "#c2410c",
		habilitadelivery: 1,
		habilitaretirada: 1,
		taxaentregapadrao: "0",
		bairrosentrega: [],
		pedidominimo: "0",
		horario: HORARIO_PADRAO,
		camposfinalizacao: CAMPOS_FINALIZACAO_PADRAO,
		idmeiospagamento: [],
		atualizadoem: agora,
	});

	if (!criado) return httpNaoEncontrado();
	return httpOk(criado);
}
