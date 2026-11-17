import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	persistirImportacaoContratos,
	resolverContratosImportacao,
} from "@/service/contrato/resolver-importacao-contratos.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoContratos,
	validarExtensaoArquivoContratos,
} from "@/util/contratos-importacao.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ImportarContratosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
	idtipodocumento: string;
};

export type ImportarContratosResposta = {
	totalImportados: number;
	totalCriados: number;
	totalGruposCriados: number;
	totalTiposCriados: number;
};

export async function importarContratosService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
	idtipodocumento,
}: ImportarContratosParametros): Promise<
	HttpResponse<ImportarContratosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const tipoDocumento =
		await buscarTipoDocumentoFinanceiroPorId(idtipodocumento);
	if (!tipoDocumento || tipoDocumento.idempresa !== idempresa) {
		return {
			success: false,
			status: 400,
			error: "Tipo de documento financeiro inválido",
			code: "CONTRATOS_IMPORTACAO_TIPO_DOCUMENTO_INVALIDO",
		};
	}

	const erroExtensao = validarExtensaoArquivoContratos(formato, nomeArquivo);
	if (erroExtensao) {
		return {
			success: false,
			status: 400,
			error: erroExtensao,
			code: "CONTRATOS_IMPORTACAO_EXTENSAO_INVALIDA",
		};
	}

	const validacao = await validarArquivoImportacaoContratos(formato, conteudo);

	if (validacao.errosGerais.length > 0) {
		return {
			success: false,
			status: 400,
			error: validacao.errosGerais.join(" "),
			code: "CONTRATOS_IMPORTACAO_ARQUIVO_INVALIDO",
		};
	}

	const resolvidos = await resolverContratosImportacao({
		idempresa,
		validacao,
	});

	const totalErros = resolvidos.reduce(
		(total, item) => total + item.erros.length,
		0,
	);

	if (totalErros > 0) {
		return {
			success: false,
			status: 400,
			error: `O arquivo possui ${totalErros} erro(s) de validação. Corrija o arquivo e tente novamente.`,
			code: "CONTRATOS_IMPORTACAO_ERROS_VALIDACAO",
		};
	}

	const persistido = await persistirImportacaoContratos({
		idempresa,
		idtipodocumento,
		resolvidos,
	});

	const agora = new Date().toISOString();
	await criarAuditoriaService({
		id: uuidv4(),
		acao: "importar_contratos",
		idusuario,
		recurso: "contrato",
		idrecurso: idempresa,
		idempresa,
		criadoem: agora,
		metadados: {
			totalCriados: persistido.criados,
			totalGruposCriados: persistido.gruposCriados,
			totalTiposCriados: persistido.tiposCriados,
			nomeArquivo: nomeArquivo ?? null,
		},
	});

	return httpOk({
		totalImportados: persistido.criados,
		totalCriados: persistido.criados,
		totalGruposCriados: persistido.gruposCriados,
		totalTiposCriados: persistido.tiposCriados,
	});
}
