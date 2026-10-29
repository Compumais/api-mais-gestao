import { access, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";
import { baixarImagemGrupoGourmet } from "../api/client";
import { urlImagemLocal } from "./protocolo-imagens";

type Grupo = {
	id: string;
	imagemremota?: string | null;
	caminhoimagem?: string | null;
};

const EXTENSOES: Record<string, string> = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
};

function diretorio(): string {
	return join(app.getPath("userData"), "grupo-gourmet-imagens");
}

async function cacheExistente(id: string): Promise<string | null> {
	try {
		const nome = (await readdir(diretorio())).find((item) => item.startsWith(`${id}-`));
		return nome ? urlImagemLocal("grupo-gourmet", nome) : null;
	} catch {
		return null;
	}
}

export async function sincronizarImagensGruposGourmet<T extends Grupo>(
	grupos: T[],
): Promise<T[]> {
	await mkdir(diretorio(), { recursive: true });
	const resultado: T[] = [];
	for (const grupo of grupos) {
		const referencia = grupo.imagemremota ?? null;
		try {
			if (!referencia) {
				await Promise.all(
					(await readdir(diretorio()))
						.filter((item) => item.startsWith(`${grupo.id}-`))
						.map((item) => rm(join(diretorio(), item), { force: true })),
				);
				resultado.push({ ...grupo, caminhoimagem: null });
				continue;
			}
			const token = new URL(referencia, "http://local").searchParams.get("v");
			if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
				resultado.push({ ...grupo, caminhoimagem: grupo.caminhoimagem ?? null });
				continue;
			}
			let nome = "";
			for (const extensao of Object.values(EXTENSOES)) {
				const candidato = `${grupo.id}-${token}${extensao}`;
				try {
					await access(join(diretorio(), candidato));
					nome = candidato;
					break;
				} catch {
					// tenta outra extensão
				}
			}
			if (!nome) {
				const imagem = await baixarImagemGrupoGourmet(referencia);
				const extensao = EXTENSOES[imagem.tipo];
				if (!extensao) throw new Error("Formato não suportado");
				nome = `${grupo.id}-${token}${extensao}`;
				await writeFile(join(diretorio(), `${nome}.tmp`), imagem.conteudo);
				await rename(join(diretorio(), `${nome}.tmp`), join(diretorio(), nome));
			}
			await Promise.all(
				(await readdir(diretorio()))
					.filter((item) => item.startsWith(`${grupo.id}-`) && item !== nome)
					.map((item) => rm(join(diretorio(), item), { force: true })),
			);
			resultado.push({
				...grupo,
				caminhoimagem: urlImagemLocal("grupo-gourmet", nome),
			});
		} catch {
			resultado.push({ ...grupo, caminhoimagem: await cacheExistente(grupo.id) });
		}
	}
	return resultado;
}
