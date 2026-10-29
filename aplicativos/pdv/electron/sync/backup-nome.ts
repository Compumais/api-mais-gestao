export function slugBackupEmpresa(nome: string, id: string): string {
	const slug = nome
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 40)
		.toLowerCase();
	const idCurto = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "id";
	return `${slug || "empresa"}_${idCurto}`;
}

export function carimboArquivoBackup(data = new Date()): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}`;
}
