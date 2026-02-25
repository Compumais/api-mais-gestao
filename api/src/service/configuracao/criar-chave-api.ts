import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { ConfiguracaoIntegracao } from "@/model/configuracao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarConfiguracaoParcial,
	buscarConfiguracaoPorEmpresa,
	criarConfiguracao,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ChaveApi = ConfiguracaoIntegracao["apis"]["chaves"][number];

interface CriarChaveApiParametros {
	idempresa: string;
	idusuario: string;
	nome: string;
}

export async function criarChaveApiService({
	idempresa,
	idusuario,
	nome,
}: CriarChaveApiParametros): Promise<HttpResponse<{ chave: string }>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	// Gerar chave de API segura
	const chaveId = uuidv4();
	const chaveRaw = `mg_${uuidv4().replace(/-/g, "")}${uuidv4().replace(/-/g, "")}`;
	const chaveHash = createHash("sha256").update(chaveRaw).digest("hex");

	// Buscar configuração existente
	let configuracao = await buscarConfiguracaoPorEmpresa({ idempresa });

	const novaChave: ChaveApi = {
		id: chaveId,
		nome,
		chave: chaveHash,
		criadoEm: new Date().toISOString(),
		ultimoUso: null,
		ativo: true,
	};

	if (!configuracao) {
		// Criar nova configuração com a chave
		configuracao = await criarConfiguracao({
			idempresa,
			integracao: {
				apis: {
					chaves: [novaChave],
				},
				webhooks: [],
				integracoesBancos: {
					habilitado: false,
					provedor: null,
					configuracoes: {},
				},
				exportacao: {
					formatoPadrao: "csv",
					incluirCabecalho: true,
					separador: ",",
				},
				backup: {
					habilitado: false,
					frequencia: null,
					horario: "00:00",
					manterBackups: 30,
				},
			},
		});
	} else {
		// Adicionar chave ao array existente
		const integracaoAtual =
			(configuracao.integracao as Partial<ConfiguracaoIntegracao>) ?? {};
		const chavesExistentes: ChaveApi[] = integracaoAtual.apis?.chaves ?? [];

		await atualizarConfiguracaoParcial({
			idempresa,
			secao: "integracao",
			dados: {
				apis: {
					chaves: [...chavesExistentes, novaChave],
				},
			},
		});
	}

	// Retornar a chave raw apenas uma vez (não armazenar)
	return httpOk({ chave: chaveRaw });
}
