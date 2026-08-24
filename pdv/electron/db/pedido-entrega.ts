import {
	arredondarMoeda,
	recalcularTotaisConta,
	type ItemGourmet,
	type TotaisContaGourmet,
} from "./conta-gourmet";

export type ModalidadePedido = "mesa" | "delivery" | "retirada";

export type StatusEntrega =
	| "recebido"
	| "producao"
	| "saiu"
	| "entregue";

export type BairroEntrega = {
	bairro: string;
	taxa: number;
};

export function normalizarModalidade(valor: unknown): ModalidadePedido {
	const v = String(valor ?? "")
		.trim()
		.toLowerCase();
	if (v === "delivery" || v === "retirada" || v === "mesa") {
		return v;
	}
	return "mesa";
}

export function ehModalidadeEntrega(modalidade: ModalidadePedido): boolean {
	return modalidade === "delivery" || modalidade === "retirada";
}

export function gerarSenhaChamada(seq: number): string {
	const n = Math.max(1, Math.floor(Number(seq) || 1));
	return String(n).padStart(3, "0").slice(-4);
}

export function parseBairrosEntrega(raw: string | null | undefined): BairroEntrega[] {
	if (!raw?.trim()) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((item) => {
				const row = item as Record<string, unknown>;
				const bairro = String(row.bairro ?? "").trim();
				const taxa = arredondarMoeda(Number(row.taxa ?? 0));
				if (!bairro || !Number.isFinite(taxa) || taxa < 0) return null;
				return { bairro, taxa };
			})
			.filter((b): b is BairroEntrega => b != null);
	} catch {
		return [];
	}
}

export function resolverTaxaEntrega(params: {
	bairro?: string | null;
	padrao: number;
	tabelaBairros: BairroEntrega[];
}): number {
	const padrao = arredondarMoeda(Math.max(0, Number(params.padrao) || 0));
	const bairro = String(params.bairro ?? "")
		.trim()
		.toLowerCase();
	if (!bairro || !params.tabelaBairros.length) {
		return padrao;
	}
	const hit = params.tabelaBairros.find(
		(b) => b.bairro.trim().toLowerCase() === bairro,
	);
	return hit ? arredondarMoeda(hit.taxa) : padrao;
}

export function podeFecharDelivery(params: {
	modalidade: ModalidadePedido;
	endereco?: string | null;
}): { ok: true } | { ok: false; motivo: string } {
	if (params.modalidade === "delivery") {
		const endereco = String(params.endereco ?? "").trim();
		if (!endereco) {
			return { ok: false, motivo: "Delivery exige endereço de entrega" };
		}
	}
	return { ok: true };
}

export function proximoStatusEntrega(
	atual: StatusEntrega | null | undefined,
	modalidade: ModalidadePedido,
): StatusEntrega | null {
	const status = (atual || "recebido") as StatusEntrega;
	if (modalidade === "retirada") {
		const ordem: StatusEntrega[] = ["recebido", "producao", "entregue"];
		const idx = ordem.indexOf(status);
		if (idx < 0 || idx >= ordem.length - 1) return null;
		return ordem[idx + 1] ?? null;
	}
	if (modalidade === "delivery") {
		const ordem: StatusEntrega[] = [
			"recebido",
			"producao",
			"saiu",
			"entregue",
		];
		const idx = ordem.indexOf(status);
		if (idx < 0 || idx >= ordem.length - 1) return null;
		return ordem[idx + 1] ?? null;
	}
	return null;
}

export function recalcularTotaisEntrega(
	itens: ItemGourmet[],
	params: {
		desconto?: number;
		valorentrega?: number;
	},
): TotaisContaGourmet {
	return recalcularTotaisConta(itens, {
		numeropessoas: 1,
		taxaAtiva: false,
		percentualTaxa: 0,
		couvertUnitario: 0,
		desconto: Number(params.desconto) || 0,
		valorentrega: Number(params.valorentrega) || 0,
	});
}

export function origemVendaPorModalidade(
	modalidade: ModalidadePedido,
): "mesa" | "delivery" | "retirada" {
	if (modalidade === "delivery") return "delivery";
	if (modalidade === "retirada") return "retirada";
	return "mesa";
}

export function rotuloProducaoEntrega(params: {
	modalidade: ModalidadePedido;
	senhaChamada?: string | null;
	protocolo?: string | null;
}): string {
	const senha = String(params.senhaChamada ?? "").trim();
	const protocolo = String(params.protocolo ?? "").trim();
	if (params.modalidade === "delivery") {
		if (senha) return `Delivery #${senha}`;
		if (protocolo) return `Delivery ${protocolo}`;
		return "Delivery";
	}
	if (params.modalidade === "retirada") {
		if (senha) return `Retirada #${senha}`;
		return "Retirada";
	}
	return "Mesa";
}
