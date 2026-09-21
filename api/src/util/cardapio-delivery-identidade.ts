export function gerarSlugCardapio(nome: string): string {
	const slug = nome
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return slug || "cardapio";
}

export function gerarProtocoloCardapio(): string {
	const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let protocolo = "";
	for (let i = 0; i < 6; i += 1) {
		protocolo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
	}
	return protocolo;
}
