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

function pesoDeFrameToledo(frame: string): number {
	const limpo = frame.replace(/[^\d.,]/g, "");
	if (/^\d{5,7}$/.test(limpo)) {
		return kgDeDigitosFixos(limpo);
	}
	return kgDeTextoLivre(frame);
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
 * Toledo/Filizola em modo contínuo costumam mandar STX…ETX; o contínuo genérico
 * aceita ASCII com ponto ou vírgula.
 */
export function extrairPesoKg(
	dados: string | Buffer,
	protocolo: ProtocoloBalanca = "toledo",
): number {
	const texto = typeof dados === "string" ? dados : dados.toString("latin1");
	if (!texto.trim()) return 0;

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

/** Comando curto para pedir peso (Toledo P / ENQ). */
export function comandoSolicitarPeso(
	protocolo: ProtocoloBalanca,
): Buffer | null {
	if (protocolo === "toledo") {
		return Buffer.from("P\r");
	}
	if (protocolo === "filizola") {
		return Buffer.from([0x05]);
	}
	return null;
}
