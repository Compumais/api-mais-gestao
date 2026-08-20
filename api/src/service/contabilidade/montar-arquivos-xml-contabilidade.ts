import type { NotaFiscalExportacaoXml } from "@/repositories/nota-fiscal-repositories.js";
import type { ArquivoXmlCompactacao } from "@/util/compactar-xmls-fiscais.js";
import { statusEhCancelada } from "@/util/nfe-status.js";
import {
	obterXmlAutorizadoNotaFiscal,
	obterXmlCancelamentoNotaFiscal,
} from "@/util/obter-xml-nota-fiscal.js";

function resolverPastaXml(modelo: string | null): "nfe" | "nfce" | null {
	if (modelo === "55") return "nfe";
	if (modelo === "65") return "nfce";
	return null;
}

export async function montarArquivosXmlContabilidade(
	notas: NotaFiscalExportacaoXml[],
): Promise<ArquivoXmlCompactacao[]> {
	const arquivos: ArquivoXmlCompactacao[] = [];

	for (const nota of notas) {
		const chave = nota.chavenfe?.trim();
		if (!chave) continue;

		const pasta = resolverPastaXml(nota.modelo);
		if (!pasta) continue;

		const cancelada = statusEhCancelada(nota.status);
		const subpasta = cancelada ? "canceladas" : undefined;

		const xmlAutorizado = await obterXmlAutorizadoNotaFiscal(nota.id);
		if (xmlAutorizado) {
			arquivos.push({
				pasta,
				subpasta,
				nomeArquivo: `${chave}-autorizado.xml`,
				conteudo: xmlAutorizado,
			});
		}

		if (!cancelada) continue;

		const xmlCancelamento = await obterXmlCancelamentoNotaFiscal(nota.id);
		if (xmlCancelamento) {
			arquivos.push({
				pasta,
				subpasta: "canceladas",
				nomeArquivo: `${chave}-cancelado.xml`,
				conteudo: xmlCancelamento,
			});
		}
	}

	return arquivos;
}
