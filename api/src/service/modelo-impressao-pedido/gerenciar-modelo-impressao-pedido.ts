import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { ModeloImpressaoPedido } from "@/model/modelo-impressao-pedido-model.js";
import type { LayoutModeloImpressaoPedido } from "@/repositories/schema.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarModeloImpressaoPedido,
	buscarModeloImpressaoPedidoPorId,
	contarModelosImpressaoPedido,
	criarModeloImpressaoPedido,
	excluirModeloImpressaoPedido,
	limparPrimarioModelosImpressaoPedido,
	listarModelosImpressaoPedido,
} from "@/repositories/modelo-impressao-pedido-repositories.js";
import { SEEDS_MODELO_IMPRESSAO_PEDIDO } from "@/util/modelo-impressao-pedido-seeds.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type AcessoEmpresa = {
	idempresa: string;
	idusuario: string;
};

async function garantirAcesso({
	idempresa,
	idusuario,
}: AcessoEmpresa): Promise<HttpResponse<null> | null> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();
	return null;
}

export async function listarModelosImpressaoPedidoService({
	idempresa,
	idusuario,
}: AcessoEmpresa): Promise<HttpResponse<ModeloImpressaoPedido[]>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido[]>;

	const modelos = await listarModelosImpressaoPedido(idempresa);
	return httpOk(modelos);
}

export async function buscarModeloImpressaoPedidoService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoPedido>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido>;

	const modelo = await buscarModeloImpressaoPedidoPorId(id);
	if (!modelo || modelo.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	return httpOk(modelo);
}

export async function criarModeloImpressaoPedidoService({
	idempresa,
	idusuario,
	nome,
	descricao,
	layout,
	primario = false,
}: AcessoEmpresa & {
	nome: string;
	descricao?: string | null;
	layout: LayoutModeloImpressaoPedido;
	primario?: boolean;
}): Promise<HttpResponse<ModeloImpressaoPedido>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido>;

	if (primario) {
		await limparPrimarioModelosImpressaoPedido(idempresa);
	}

	const criado = await criarModeloImpressaoPedido({
		id: uuidv4(),
		idempresa,
		nome,
		descricao: descricao ?? null,
		layout,
		primario,
		sistema: false,
		ativo: true,
	});

	if (!criado) {
		return httpBadRequest("Não foi possível criar o modelo");
	}
	return httpCriacao(criado);
}

export async function atualizarModeloImpressaoPedidoService({
	id,
	idempresa,
	idusuario,
	nome,
	descricao,
	layout,
	primario,
	ativo,
}: AcessoEmpresa & {
	id: string;
	nome?: string;
	descricao?: string | null;
	layout?: LayoutModeloImpressaoPedido;
	primario?: boolean;
	ativo?: boolean;
}): Promise<HttpResponse<ModeloImpressaoPedido>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido>;

	const existente = await buscarModeloImpressaoPedidoPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	if (existente.sistema) {
		return httpBadRequest(
			"Modelos do sistema não podem ser editados. Duplique o modelo para personalizar.",
		);
	}

	if (primario === true) {
		await limparPrimarioModelosImpressaoPedido(idempresa);
	}

	const atualizado = await atualizarModeloImpressaoPedido(id, {
		...(nome !== undefined ? { nome } : {}),
		...(descricao !== undefined ? { descricao } : {}),
		...(layout !== undefined ? { layout } : {}),
		...(primario !== undefined ? { primario } : {}),
		...(ativo !== undefined ? { ativo } : {}),
	});

	if (!atualizado) {
		return httpBadRequest("Não foi possível atualizar o modelo");
	}
	return httpOk(atualizado);
}

export async function excluirModeloImpressaoPedidoService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<HttpResponse<null>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso;

	const existente = await buscarModeloImpressaoPedidoPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	if (existente.sistema) {
		return httpBadRequest("Modelos do sistema não podem ser excluídos");
	}

	await excluirModeloImpressaoPedido(id);
	return httpSemConteudo();
}

export async function definirPrimarioModeloImpressaoPedidoService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoPedido>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido>;

	const existente = await buscarModeloImpressaoPedidoPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	await limparPrimarioModelosImpressaoPedido(idempresa);
	const atualizado = await atualizarModeloImpressaoPedido(id, {
		primario: true,
	});
	if (!atualizado) {
		return httpBadRequest("Não foi possível definir o modelo como primário");
	}
	return httpOk(atualizado);
}

export async function duplicarModeloImpressaoPedidoService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoPedido>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido>;

	const existente = await buscarModeloImpressaoPedidoPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const copia = await criarModeloImpressaoPedido({
		id: uuidv4(),
		idempresa,
		nome: `${existente.nome} (cópia)`,
		descricao: existente.descricao,
		layout: existente.layout,
		primario: false,
		sistema: false,
		ativo: true,
	});

	if (!copia) {
		return httpBadRequest("Não foi possível duplicar o modelo");
	}
	return httpCriacao(copia);
}

export async function seedModelosImpressaoPedidoService({
	idempresa,
	idusuario,
}: AcessoEmpresa): Promise<HttpResponse<ModeloImpressaoPedido[]>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoPedido[]>;

	const total = await contarModelosImpressaoPedido(idempresa);
	if (total > 0) {
		const existentes = await listarModelosImpressaoPedido(idempresa);
		return httpOk(existentes);
	}

	const criados: ModeloImpressaoPedido[] = [];
	for (const seed of SEEDS_MODELO_IMPRESSAO_PEDIDO) {
		const registro = await criarModeloImpressaoPedido({
			id: uuidv4(),
			idempresa,
			nome: seed.nome,
			descricao: seed.descricao,
			layout: seed.layout(),
			primario: seed.primario,
			sistema: true,
			ativo: true,
		});
		if (registro) criados.push(registro);
	}

	return httpOk(criados);
}
