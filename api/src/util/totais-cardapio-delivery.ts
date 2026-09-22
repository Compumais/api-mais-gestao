import type { BairroEntrega } from "@/model/cardapio-delivery-tipos.js";

export function numberFromDecimal(
	valor: string | number | null | undefined,
): number {
	if (valor == null || valor === "") return 0;
	const n =
		typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
	return Number.isFinite(n) ? n : 0;
}

export function arredondarDinheiro(valor: number): number {
	return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function precoPizzaMeioAMeio(primeiro: number, segundo: number): number {
	return arredondarDinheiro(Math.max(primeiro, segundo));
}

export function resolverTaxaEntrega(params: {
	modalidade: "delivery" | "retirada";
	bairro?: string | null;
	taxaPadrao: number;
	bairros: BairroEntrega[];
}): number {
	if (params.modalidade !== "delivery") return 0;
	const nome = params.bairro?.trim().toLowerCase();
	if (nome) {
		const encontrado = params.bairros.find(
			(item) => item.nome.trim().toLowerCase() === nome,
		);
		if (encontrado) {
			return arredondarDinheiro(Number(encontrado.taxa) || 0);
		}
	}
	return arredondarDinheiro(params.taxaPadrao);
}

export function campoFinalizacaoVisivel(
	condicao: { campoid: string; valor: string } | null | undefined,
	respostas: Record<string, string>,
): boolean {
	if (!condicao?.campoid) return true;
	return (respostas[condicao.campoid] ?? "") === condicao.valor;
}

export function montarPixCopiaCola(params: {
	chave: string;
	nome: string;
	cidade: string;
	valor: number;
	txid: string;
}): string {
	const chave = params.chave.trim().slice(0, 77);
	const nome = params.nome.trim().slice(0, 25) || "MAIS GESTAO";
	const cidade = params.cidade.trim().slice(0, 15) || "SAO PAULO";
	const valor = arredondarDinheiro(params.valor).toFixed(2);
	const txid =
		params.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "PEDIDO";

	function campo(id: string, valorCampo: string): string {
		const tam = String(valorCampo.length).padStart(2, "0");
		return `${id}${tam}${valorCampo}`;
	}

	const merchantAccount = campo(
		"26",
		`${campo("00", "br.gov.bcb.pix")}${campo("01", chave)}`,
	);
	const additional = campo("62", campo("05", txid));
	const payloadSemCrc =
		campo("00", "01") +
		campo("01", "12") +
		merchantAccount +
		campo("52", "0000") +
		campo("53", "986") +
		campo("54", valor) +
		campo("58", "BR") +
		campo("59", nome) +
		campo("60", cidade) +
		additional +
		"6304";

	return payloadSemCrc + crc16(payloadSemCrc);
}

function crc16(payload: string): string {
	let crc = 0xffff;
	for (let i = 0; i < payload.length; i += 1) {
		crc ^= payload.charCodeAt(i) << 8;
		for (let j = 0; j < 8; j += 1) {
			if ((crc & 0x8000) !== 0) {
				crc = ((crc << 1) ^ 0x1021) & 0xffff;
			} else {
				crc = (crc << 1) & 0xffff;
			}
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, "0");
}
