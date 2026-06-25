import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type TipoXmlNfe = "assinado" | "autorizado" | "cancelado" | "inutilizado";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function obterDiretorioRaizStorage(): string {
	const raiz = process.env.NFE_STORAGE_PATH;
	if (raiz) return raiz;
	// Sobe 3 níveis: util → src → api → raiz do projeto
	return resolve(__dirname, "../../../storage/xmls");
}

export function montarCaminhoXml(
	idempresa: string,
	chave: string,
	tipo: TipoXmlNfe,
): string {
	const agora = new Date();
	const ano = agora.getFullYear().toString();
	const mes = String(agora.getMonth() + 1).padStart(2, "0");
	const nomeArquivo = `${chave}-${tipo}.xml`;
	return join(idempresa, ano, mes, nomeArquivo);
}

export async function salvarXmlEmDisco(
	idempresa: string,
	chave: string,
	tipo: TipoXmlNfe,
	conteudoXml: string,
): Promise<string> {
	const caminho = montarCaminhoXml(idempresa, chave, tipo);
	const raiz = obterDiretorioRaizStorage();
	const caminhoCompleto = join(raiz, caminho);
	const diretorio = join(raiz, idempresa, new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, "0"));

	await mkdir(diretorio, { recursive: true });
	await writeFile(caminhoCompleto, conteudoXml, "utf8");

	return caminho;
}

export async function salvarXmlEventoEmDisco(
	idempresa: string,
	identificador: string,
	tipo: TipoXmlNfe,
	conteudoXml: string,
): Promise<string> {
	const identificadorSanitizado = identificador.replace(/[^\w.-]/g, "_");
	return salvarXmlEmDisco(idempresa, identificadorSanitizado, tipo, conteudoXml);
}

export function obterCaminhoCompletoXml(caminho: string): string {
	return join(obterDiretorioRaizStorage(), caminho);
}
