export type ProtocoloBalanca = "toledo" | "filizola" | "continuo";

export function normalizarProtocoloBalanca(
	valor: string | undefined | null,
): ProtocoloBalanca {
	const v = (valor ?? "").trim().toLowerCase();
	if (v === "filizola") return "filizola";
	if (v === "continuo" || v === "contínuo") return "continuo";
	return "toledo";
}

function arredondarKg(valor: number): number {
	if (!Number.isFinite(valor) || valor <= 0) return 0;
	return Math.round(valor * 1000) / 1000;
}

function kgDeGramas(gramas: number): number {
	return arredondarKg(gramas / 1000);
}

/** Converte 4–7 dígitos com 3 casas implícitas (001250 → 1,250 kg). */
function kgDeDigitosFixos(digitos: string): number {
	const n = Number(digitos);
	if (!Number.isFinite(n) || n <= 0) return 0;
	if (digitos.length <= 3) return kgDeGramas(n);
	return arredondarKg(n / 1000);
}

function kgDeTextoLivre(texto: string): number {
	const normalizado = texto.replace(",", ".").trim();
	const comPonto = normalizado.match(/(\d+\.\d{1,3})/);
	if (comPonto) {
		return arredondarKg(Number(comPonto[1]));
	}
	const soDigitos = normalizado.replace(/\D/g, "");
	if (soDigitos.length >= 4) {
		return kgDeDigitosFixos(soDigitos.slice(-6));
	}
	const inteiro = Number(soDigitos);
	if (inteiro > 0 && inteiro < 1000) {
		return arredondarKg(inteiro);
	}
	return 0;
}

function framesStxEtx(buffer: string): string[] {
	const frames: string[] = [];
	let inicio = -1;
	for (let i = 0; i < buffer.length; i++) {
		const c = buffer.charCodeAt(i);
		if (c === 0x02) {
			inicio = i + 1;
			continue;
		}
		if (c === 0x03 && inicio >= 0) {
			frames.push(buffer.slice(inicio, i));
			inicio = -1;
		}
	}
	return frames;
}

function ultimoByte(texto: string, code: number): number {
	for (let i = texto.length - 1; i >= 0; i--) {
		if (texto.charCodeAt(i) === code) return i;
	}
	return -1;
}

/**
 * Protocolo A da Toledo (ACBr): [STX][S1][PPPPPP][S2][TTTTTT][UUUUUU][CR][CS].
 * O peso são os 6 bytes a partir do 3º caractere do quadro. Bit 3 de S2
 * ligado usa 2 casas (divisor 100); senão, 3 casas (divisor 1000).
 * Retorna null quando o buffer não é esse quadro.
 */
function pesoProtocoloA(texto: string): number | null {
	if (texto.length <= 20) return null;
	const stx = ultimoByte(texto, 0x02);
	if (stx < 0 || texto.length - stx <= 20) return null;
	if (stx + 8 >= texto.length) return null;
	const s2 = texto.charCodeAt(stx + 8);
	const divisor = (s2 & 0x08) !== 0 ? 100 : 1000;
	const campo = texto.slice(stx + 2, stx + 8).trim();
	if (!/^\d{4,6}$/.test(campo)) return null;
	const n = Number(campo);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return arredondarKg(n / divisor);
}

function pesoDeConteudoToledo(frame: string): number {
	const corpo = frame.replace(/kg/gi, "").trim();
	if (!corpo) return 0;
	if (/[.,]/.test(corpo)) return kgDeTextoLivre(corpo);
	const digitos = corpo.replace(/\D/g, "");
	if (digitos.length >= 4 && digitos.length <= 7) {
		return kgDeDigitosFixos(digitos);
	}
	return kgDeTextoLivre(corpo);
}

function pesoDeFrameToledo(frame: string): number {
	return pesoDeConteudoToledo(frame);
}

/** Toledo como a ACBr: protocolo A, senão STX…ETX (B), senão STX…CR (C). */
function interpretarToledo(texto: string): number {
	const protocoloA = pesoProtocoloA(texto);
	if (protocoloA !== null) return protocoloA;

	const frames = framesStxEtx(texto);
	if (frames.length) {
		return pesoDeConteudoToledo(frames[frames.length - 1] ?? "");
	}

	const stx = ultimoByte(texto, 0x02);
	if (stx >= 0) {
		const cr = texto.indexOf("\r", stx + 1);
		if (cr > stx) {
			return pesoDeConteudoToledo(texto.slice(stx + 1, cr));
		}
	}

	const linhas = texto.split(/[\r\n]+/).filter((l) => l.trim());
	const ultima = linhas[linhas.length - 1] ?? texto;
	return kgDeTextoLivre(ultima);
}

function pesoDeFrameFilizola(frame: string): number {
	const digitos = frame.replace(/\D/g, "");
	if (digitos.length >= 4) {
		return kgDeGramas(Number(digitos.slice(-6)));
	}
	return kgDeTextoLivre(frame);
}

/**
 * Extrai o último peso válido (kg) do fluxo serial da balança.
 * Toledo segue a ACBr (protocolos A, B e C). O quadro curto STX + dígitos + ETX
 * do emulador continua válido. Filizola lê gramas; o contínuo aceita ASCII.
 */
export function extrairPesoKg(
	dados: string | Buffer,
	protocolo: ProtocoloBalanca = "toledo",
): number {
	const texto = typeof dados === "string" ? dados : dados.toString("latin1");
	if (!texto) return 0;

	if (protocolo === "toledo") {
		return interpretarToledo(texto);
	}

	const frames = framesStxEtx(texto);
	if (frames.length) {
		const ultimo = frames[frames.length - 1] ?? "";
		if (protocolo === "filizola") {
			return pesoDeFrameFilizola(ultimo);
		}
		return pesoDeFrameToledo(ultimo);
	}

	const linhas = texto.split(/[\r\n]+/).filter((l) => l.trim());
	const ultima = linhas[linhas.length - 1] ?? texto;
	return kgDeTextoLivre(ultima);
}

const ENQ = Buffer.from([0x05]);

/**
 * Pedido de peso no mesmo comando da ACBr: ENQ (0x05) para Toledo e Filizola.
 * Contínuo só escuta.
 */
export function comandoSolicitarPeso(
	protocolo: ProtocoloBalanca,
): Buffer | null {
	if (protocolo === "toledo" || protocolo === "filizola") {
		return ENQ;
	}
	return null;
}

/** O emulador de desenvolvimento respondia a `P` + CR, não ao ENQ. */
export function comandoFallbackEmuladorToledo(): Buffer {
	return Buffer.from("P\r");
}
