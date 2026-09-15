import { MARCADOR_QR_DANFCE, montarTextoDanfce } from "./danfce-layout";
import type { DadosDanfce } from "./danfce-xml";

function escapeHtml(valor: string): string {
	return valor
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function blocoPre(texto: string): string {
	const limpo = texto.replace(/^\n+/, "").replace(/\n+$/, "");
	if (!limpo.trim()) return "";
	return `<pre>${escapeHtml(limpo)}\n</pre>`;
}

/**
 * HTML do DANFE NFC-e: o mesmo cupom de 48 colunas do ESC/POS,
 * com QR no ponto do marcador. Evita colunas CSS que quebram no spooler.
 */
export function montarHtmlDanfce(dados: DadosDanfce, qrSvg?: string): string {
	const texto = montarTextoDanfce(dados);
	const partes = texto.split(MARCADOR_QR_DANFCE);
	const qr = qrSvg
		? `<img class="qr" alt="QR Code NFC-e" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}" />`
		: "";
	const corpo = partes
		.map(
			(parte, idx) =>
				`${blocoPre(parte)}${idx < partes.length - 1 ? qr : ""}`,
		)
		.join("");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body {
    margin: 0; padding: 0; width: 72mm;
    background: #fff; color: #000;
  }
  .danfce {
    box-sizing: border-box;
    width: 72mm;
    padding: 1mm 1.5mm 4mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 7.2pt;
    line-height: 1.18;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  pre {
    margin: 0;
    padding: 0;
    font: inherit;
    white-space: pre;
    overflow: hidden;
  }
  .qr {
    display: block;
    width: 32mm;
    height: 32mm;
    margin: 2mm auto;
  }
</style>
</head>
<body>
<div class="danfce">
${corpo}
</div>
</body>
</html>`;
}
