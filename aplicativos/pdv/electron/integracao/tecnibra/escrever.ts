import { copyFile, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function escreverArquivoAtomico(
	destino: string,
	conteudo: string,
): Promise<void> {
	const pasta = dirname(destino);
	await mkdir(pasta, { recursive: true });
	const temporario = `${destino}.tmp`;
	await writeFile(temporario, conteudo, "utf-8");
	try {
		await rename(temporario, destino);
	} catch (err) {
		const codigo =
			err && typeof err === "object" && "code" in err ? err.code : "";
		if (codigo === "EXDEV") {
			await copyFile(temporario, destino);
			await unlink(temporario);
			return;
		}
		try {
			await unlink(destino);
		} catch {
			// destino pode não existir
		}
		try {
			await rename(temporario, destino);
		} catch (segundo) {
			const codigo2 =
				segundo && typeof segundo === "object" && "code" in segundo
					? segundo.code
					: "";
			if (codigo2 === "EXDEV") {
				await copyFile(temporario, destino);
				await unlink(temporario);
				return;
			}
			throw segundo;
		}
	}
}
