import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listarNfceComXml } from "../db/repos";
import {
	type CriterioDataXmlNfce,
	validarPeriodoXmlNfce,
	xmlNfceEntraNoPeriodo,
} from "./datas-xml-nfce";
import { nomeArquivoXmlNfce } from "./xml-local";

export type ExportarXmlNfceParametros = {
	dataInicio: string;
	dataFim: string;
	criterio: CriterioDataXmlNfce;
	pasta: string;
};

export type ResultadoExportarXmlNfce = {
	pasta: string;
	total: number;
	ignorados: number;
};

export async function exportarXmlsNfce(
	params: ExportarXmlNfceParametros,
): Promise<ResultadoExportarXmlNfce> {
	const erroPeriodo = validarPeriodoXmlNfce(params.dataInicio, params.dataFim);
	if (erroPeriodo) {
		throw new Error(erroPeriodo);
	}
	if (params.criterio !== "emissao" && params.criterio !== "autorizacao") {
		throw new Error("Informe se o período é por emissão ou autorização");
	}
	const pastaBase = params.pasta.trim();
	if (!pastaBase) {
		throw new Error("Escolha a pasta de destino");
	}

	const destino = join(
		pastaBase,
		`xml-nfce-${params.dataInicio}_${params.dataFim}-${params.criterio}`,
	);
	await mkdir(destino, { recursive: true });

	const notas = await listarNfceComXml();
	let total = 0;
	let ignorados = 0;

	for (const nota of notas) {
		const xml = nota.xml.trim();
		if (!xml) {
			ignorados += 1;
			continue;
		}
		const { incluir } = xmlNfceEntraNoPeriodo({
			xml,
			criterio: params.criterio,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			fallbackEmissao: nota.criadoem,
		});
		if (!incluir) {
			ignorados += 1;
			continue;
		}
		const nome = nomeArquivoXmlNfce({
			chave: nota.chave,
			serie: nota.serie,
			numero: nota.numero,
		});
		await writeFile(join(destino, nome), xml, "utf8");
		total += 1;
	}

	return { pasta: destino, total, ignorados };
}
