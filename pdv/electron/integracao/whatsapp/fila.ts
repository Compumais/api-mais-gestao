export type ItemFilaWhatsapp = {
	id: string;
	telefoneE164: string;
	corpo: string;
	idconta?: string | null;
	tentativas: number;
	criadoem: string;
};

const fila: ItemFilaWhatsapp[] = [];
const MAX_TENTATIVAS = 5;

export function enfileirarMensagemWhatsapp(item: {
	telefoneE164: string;
	corpo: string;
	idconta?: string | null;
}): ItemFilaWhatsapp {
	const entrada: ItemFilaWhatsapp = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		telefoneE164: item.telefoneE164,
		corpo: item.corpo,
		idconta: item.idconta ?? null,
		tentativas: 0,
		criadoem: new Date().toISOString(),
	};
	fila.push(entrada);
	return entrada;
}

export function listarFilaWhatsapp(): ItemFilaWhatsapp[] {
	return [...fila];
}

export function obterProximoFilaWhatsapp(): ItemFilaWhatsapp | null {
	return fila[0] ?? null;
}

export function concluirItemFilaWhatsapp(id: string): void {
	const idx = fila.findIndex((item) => item.id === id);
	if (idx >= 0) fila.splice(idx, 1);
}

export function registrarFalhaFilaWhatsapp(id: string): boolean {
	const item = fila.find((entrada) => entrada.id === id);
	if (!item) return false;
	item.tentativas += 1;
	if (item.tentativas >= MAX_TENTATIVAS) {
		concluirItemFilaWhatsapp(id);
		return false;
	}
	// reenvia para o fim da fila
	concluirItemFilaWhatsapp(id);
	fila.push(item);
	return true;
}
