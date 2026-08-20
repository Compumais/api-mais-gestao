import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { ModeloImpressaoOrdemServico } from "@/model/modelo-impressao-ordem-servico-model.js";
import type { LayoutModeloImpressaoOs } from "@/repositories/schema.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarModeloImpressaoOs,
	buscarModeloImpressaoOsPorId,
	contarModelosImpressaoOs,
	criarModeloImpressaoOs,
	excluirModeloImpressaoOs,
	limparPrimarioModelosImpressaoOs,
	listarModelosImpressaoOs,
} from "@/repositories/modelo-impressao-os-repositories.js";
import { SEEDS_MODELO_IMPRESSAO_OS } from "@/util/modelo-impressao-os-seeds.js";
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

export async function listarModelosImpressaoOsService({
	idempresa,
	idusuario,
}: AcessoEmpresa): Promise<HttpResponse<ModeloImpressaoOrdemServico[]>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico[]>;

	const modelos = await listarModelosImpressaoOs(idempresa);
	return httpOk(modelos);
}

export async function buscarModeloImpressaoOsService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoOrdemServico>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico>;

	const modelo = await buscarModeloImpressaoOsPorId(id);
	if (!modelo || modelo.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	return httpOk(modelo);
}

export async function criarModeloImpressaoOsService({
	idempresa,
	idusuario,
	nome,
	descricao,
	layout,
	primario = false,
}: AcessoEmpresa & {
	nome: string;
	descricao?: string | null;
	layout: LayoutModeloImpressaoOs;
	primario?: boolean;
}): Promise<HttpResponse<ModeloImpressaoOrdemServico>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico>;

	if (primario) {
		await limparPrimarioModelosImpressaoOs(idempresa);
	}

	const criado = await criarModeloImpressaoOs({
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

export async function atualizarModeloImpressaoOsService({
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
	layout?: LayoutModeloImpressaoOs;
	primario?: boolean;
	ativo?: boolean;
}): Promise<HttpResponse<ModeloImpressaoOrdemServico>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico>;

	const existente = await buscarModeloImpressaoOsPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	if (existente.sistema) {
		return httpBadRequest(
			"Modelos do sistema não podem ser editados. Duplique o modelo para personalizar.",
		);
	}

	if (primario === true) {
		await limparPrimarioModelosImpressaoOs(idempresa);
	}

	const atualizado = await atualizarModeloImpressaoOs(id, {
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

export async function excluirModeloImpressaoOsService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<HttpResponse<null>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso;

	const existente = await buscarModeloImpressaoOsPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	if (existente.sistema) {
		return httpBadRequest("Modelos do sistema não podem ser excluídos");
	}

	await excluirModeloImpressaoOs(id);
	return httpSemConteudo();
}

export async function definirPrimarioModeloImpressaoOsService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoOrdemServico>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico>;

	const existente = await buscarModeloImpressaoOsPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	await limparPrimarioModelosImpressaoOs(idempresa);
	const atualizado = await atualizarModeloImpressaoOs(id, { primario: true });
	if (!atualizado) {
		return httpBadRequest("Não foi possível definir o modelo como primário");
	}
	return httpOk(atualizado);
}

export async function duplicarModeloImpressaoOsService({
	id,
	idempresa,
	idusuario,
}: AcessoEmpresa & { id: string }): Promise<
	HttpResponse<ModeloImpressaoOrdemServico>
> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico>;

	const existente = await buscarModeloImpressaoOsPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const copia = await criarModeloImpressaoOs({
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

export async function seedModelosImpressaoOsService({
	idempresa,
	idusuario,
}: AcessoEmpresa): Promise<HttpResponse<ModeloImpressaoOrdemServico[]>> {
	const acesso = await garantirAcesso({ idempresa, idusuario });
	if (acesso) return acesso as HttpResponse<ModeloImpressaoOrdemServico[]>;

	const total = await contarModelosImpressaoOs(idempresa);
	if (total > 0) {
		const existentes = await listarModelosImpressaoOs(idempresa);
		return httpOk(existentes);
	}

	const criados: ModeloImpressaoOrdemServico[] = [];
	for (const seed of SEEDS_MODELO_IMPRESSAO_OS) {
		const registro = await criarModeloImpressaoOs({
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
