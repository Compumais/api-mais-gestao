import qrcode from "./vendor/qrcode-generator.js";

export function svgQrCode(conteudo: string): string {
	const qr = qrcode(0, "M");
	qr.addData(conteudo);
	qr.make();
	return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
