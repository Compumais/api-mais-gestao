import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	persistirImportacaoEntidades,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	resolverImportacaoEntidades,
	type TipoImportacaoEntidade,
} from "@/service/entidades/resolver-importacao-entidades.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoEntidades,
	validarExtensaoArquivoEntidades,
} from "@/util/entidades-importacao.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ImportarEntidadesParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
	tipo: TipoImportacaoEntidade;
};

export type ImportarEntidadesResposta = {
	totalImportados: number;
	totalCriados: number;
	totalAtualizados: number;
};

export async function importarEntidadesService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
	tipo,
}: ImportarEntidadesParametros): Promise<
	HttpResponse<ImportarEntidadesResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroExtensao = validarExtensaoArquivoEntidades(formato, nomeArquivo);
	if (erroExtensao) {
		return httpBadRequest(erroExtensao);
	}

	const validacao = await validarArquivoImportacaoEntidades(formato, conteudo);

	if (validacao.errosGerais.length > 0) {
		return httpBadRequest(validacao.errosGerais.join(" "));
	}

	const resolvidos = await resolverImportacaoEntidades({
		idempresa,
		tipo,
		validacao,
	});

	const totalErros = resolvidos.reduce(
		(total, entidade) => total + entidade.erros.length,
		0,
	);

	if (totalErros > 0) {
		return httpBadRequest(
			`O arquivo possui ${totalErros} erro(s) de validação. Corrija o arquivo e tente novamente.`,
		);
	}

	const criar = resolvidos
		.filter((entidade) => entidade.acao === "criar")
		.map((entidade) => entidade.dados);

	const atualizar = resolvidos
		.filter((entidade) => entidade.acao === "atualizar" && entidade.idExistente)
		.map((entidade) => {
			const dados = entidade.dados;
			return {
				id: entidade.idExistente as string,
				dados: {
					nome: dados.nome,
					cnpjcpf: dados.cnpjcpf,
					razaosocial: dados.razaosocial,
					tipopessoa: dados.tipopessoa,
					indiedest: dados.indiedest,
					inscricaoestadual: dados.inscricaoestadual,
					rg: dados.rg,
					email: dados.email,
					telefone: dados.telefone,
					endereco: dados.endereco,
					numeroendereco: dados.numeroendereco,
					complemento: dados.complemento,
					bairro: dados.bairro,
					cep: dados.cep,
					fax: dados.fax,
					nascimento: dados.nascimento,
					pais: dados.pais,
					atualizadoem: dados.atualizadoem,
					...(tipo === "cliente" ? { cliente: 1 } : { fornecedor: 1 }),
				},
			};
		});

	const persistido = await persistirImportacaoEntidades({ criar, atualizar });

	await criarAuditoriaService({
		id: uuidv4(),
		acao: tipo === "cliente" ? "importar_clientes" : "importar_fornecedores",
		idusuario,
		recurso: "entidade",
		idrecurso: idempresa,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			totalCriados: persistido.criados.length,
			totalAtualizados: persistido.atualizados.length,
			nomeArquivo: nomeArquivo ?? null,
			tipo,
		},
	});

	return httpOk({
		totalImportados: persistido.criados.length + persistido.atualizados.length,
		totalCriados: persistido.criados.length,
		totalAtualizados: persistido.atualizados.length,
	});
}
