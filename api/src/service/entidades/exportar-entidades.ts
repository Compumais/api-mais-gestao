import type { Buffer } from "node:buffer";
import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	type FiltrosExportacaoEntidades,
	listarTodasEntidadesParaExportacao,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { CONTENT_TYPE_CSV, gerarCsv } from "@/util/csv.js";
import { hojeBrasiliaIsoDate } from "@/util/data-hora-brasilia.js";
import { COLUNAS_EXPORTACAO_ENTIDADES } from "@/util/entidades-importacao.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ExportarEntidadesParametros = FiltrosExportacaoEntidades & {
	idusuario: string;
};

type ExportarEntidadesResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

function texto(valor: string | number | null | undefined): string {
	if (valor == null) return "";
	return String(valor);
}

function formatarTipoPessoa(valor: number | null): string {
	if (valor === 0) return "Física";
	if (valor === 1) return "Jurídica";
	return "";
}

function formatarIndIeDest(valor: number | null): string {
	if (valor === 1) return "1 — Contribuinte ICMS";
	if (valor === 2) return "2 — Contribuinte Isento de IE";
	if (valor === 9) return "9 — Não Contribuinte";
	return "";
}

function formatarDataCsv(valor: string | null | undefined): string {
	if (!valor) return "";
	const iso = valor.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		const [ano, mes, dia] = iso.split("-");
		return `${dia}/${mes}/${ano}`;
	}
	const instante = new Date(iso);
	if (Number.isNaN(instante.getTime())) return valor;
	const [ano, mes, dia] = hojeBrasiliaIsoDate(instante).split("-");
	return `${dia}/${mes}/${ano}`;
}

function montarLinha(entidade: Entidade): string[] {
	return [
		texto(entidade.nome),
		texto(entidade.razaosocial),
		texto(entidade.cnpjcpf),
		texto(entidade.endereco),
		formatarTipoPessoa(entidade.tipopessoa),
		formatarIndIeDest(entidade.indiedest),
		texto(entidade.inscricaoestadual),
		texto(entidade.rg),
		texto(entidade.email),
		texto(entidade.telefone),
		texto(entidade.numeroendereco),
		texto(entidade.complemento),
		texto(entidade.bairro),
		texto(entidade.cep),
		texto(entidade.fax),
		formatarDataCsv(entidade.nascimento),
		texto(entidade.pais),
		formatarDataCsv(entidade.criadoem),
	];
}

export async function exportarEntidadesService({
	idusuario,
	...filtros
}: ExportarEntidadesParametros): Promise<
	HttpResponse<ExportarEntidadesResposta>
> {
	if (filtros.cliente !== 1 && filtros.fornecedor !== 1) {
		return httpBadRequest(
			"Informe se a exportação é de clientes ou fornecedores",
		);
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		filtros.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const entidades = await listarTodasEntidadesParaExportacao(filtros);
	const filename = filtros.cliente === 1 ? "clientes.csv" : "fornecedores.csv";

	return httpOk({
		content: gerarCsv({
			colunas: [...COLUNAS_EXPORTACAO_ENTIDADES],
			linhas: entidades.map(montarLinha),
		}),
		contentType: CONTENT_TYPE_CSV,
		filename,
	});
}
