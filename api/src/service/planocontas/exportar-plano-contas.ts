import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarTodosPlanoContasPorEmpresa } from "@/repositories/plano-contas-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";

type ExportarPlanoContasParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
};

type ExportarPlanoContasResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const CABECALHO = ["Código", "Descrição", "Tipo", "Ativo"];

function formatarAtivo(inativo: number | null | undefined): string {
	return inativo === 1 ? "Não" : "Sim";
}

function montarLinhasExportacao(planos: PlanoContas[]): string[][] {
	return planos.map((plano) => [
		plano.codigo ?? "",
		plano.nome ?? "",
		plano.tipomovimento ?? "",
		formatarAtivo(plano.inativo),
	]);
}

async function gerarXlsx(linhas: string[][]): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Plano de Contas");

	planilha.columns = [
		{ header: CABECALHO[0], key: "codigo", width: 15 },
		{ header: CABECALHO[1], key: "descricao", width: 40 },
		{ header: CABECALHO[2], key: "tipo", width: 10 },
		{ header: CABECALHO[3], key: "ativo", width: 10 },
	];

	planilha.getRow(1).font = { bold: true };

	for (const linha of linhas) {
		planilha.addRow(linha);
	}

	planilha.getColumn(1).numFmt = "@";

	const conteudo = await workbook.xlsx.writeBuffer();

	return Buffer.from(conteudo);
}

function gerarCsv(linhas: string[][]): Buffer {
	const conteudo = stringify([CABECALHO, ...linhas], {
		delimiter: ";",
	});

	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

export async function exportarPlanoContasService({
	idempresa,
	idusuario,
	formato,
}: ExportarPlanoContasParametros): Promise<
	HttpResponse<ExportarPlanoContasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const planos = await listarTodosPlanoContasPorEmpresa(idempresa);
	const linhas = montarLinhasExportacao(planos);

	if (formato === "xlsx") {
		return httpOk<ExportarPlanoContasResposta>({
			content: await gerarXlsx(linhas),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: "plano-de-contas.xlsx",
		});
	}

	return httpOk<ExportarPlanoContasResposta>({
		content: gerarCsv(linhas),
		contentType: "text/csv; charset=utf-8",
		filename: "plano-de-contas.csv",
	});
}
