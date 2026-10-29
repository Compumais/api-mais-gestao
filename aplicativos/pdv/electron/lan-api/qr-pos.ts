import { svgQrCode } from "../impressora/qr-svg";

export type ConexaoQrPos = {
	url: string;
	conteudo: string;
	svg: string;
};

export function montarConteudoQrPos(url: string): string {
	return `mgpos://connect?v=1&url=${encodeURIComponent(url)}`;
}

export function criarConexoesQrPos(
	ips: string[],
	porta: number,
): ConexaoQrPos[] {
	if (porta < 1 || porta > 65_535) return [];

	return ips.map((ip) => {
		const url = `http://${ip}:${porta}`;
		const conteudo = montarConteudoQrPos(url);
		return {
			url,
			conteudo,
			svg: svgQrCode(conteudo),
		};
	});
}
