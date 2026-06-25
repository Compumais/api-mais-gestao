import PDFDocument from "pdfkit";

export type ColunaPdfRelatorio = {
	label: string;
	width: number;
	align?: "left" | "right" | "center";
};

export type GerarPdfRelatorioParams = {
	titulo: string;
	empresaNome: string;
	empresaCnpj: string;
	periodoInicio: string;
	periodoFim: string;
	colunas: ColunaPdfRelatorio[];
	linhas: string[][];
	resumoLinhas?: string[];
	filename: string;
};

export type PdfRelatorioResultado = {
	content: Buffer;
	contentType: "application/pdf";
	filename: string;
};

const MARGEM = 40;
const ALTURA_RODAPE = 30;

function formatarDataBr(data: string): string {
	return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatarCnpj(cnpj: string): string {
	const digits = cnpj.replace(/\D/g, "");
	if (digits.length !== 14) return cnpj;
	return digits.replace(
		/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
		"$1.$2.$3/$4-$5",
	);
}

export function gerarPdfRelatorio(
	params: GerarPdfRelatorioParams,
): Promise<PdfRelatorioResultado> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: "A4",
			layout: "landscape",
			margin: MARGEM,
			info: { Title: params.titulo },
		});

		const chunks: Buffer[] = [];
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => {
			resolve({
				content: Buffer.concat(chunks),
				contentType: "application/pdf",
				filename: params.filename,
			});
		});
		doc.on("error", reject);

		const larguraUtil =
			doc.page.width - MARGEM * 2;
		const larguraColunas = params.colunas.reduce((s, c) => s + c.width, 0);
		const escala =
			larguraColunas > larguraUtil ? larguraUtil / larguraColunas : 1;

		doc
			.fontSize(16)
			.fillColor("#111827")
			.text(params.titulo, { align: "center" });
		doc.moveDown(0.5);
		doc
			.fontSize(10)
			.fillColor("#374151")
			.text(`${params.empresaNome} — CNPJ ${formatarCnpj(params.empresaCnpj)}`, {
				align: "center",
			});
		doc.text(
			`Período: ${formatarDataBr(params.periodoInicio)} a ${formatarDataBr(params.periodoFim)}`,
			{ align: "center" },
		);
		doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, {
			align: "center",
		});

		if (params.resumoLinhas?.length) {
			doc.moveDown(0.8);
			doc.fontSize(9).fillColor("#1f2937");
			for (const linha of params.resumoLinhas) {
				doc.text(linha);
			}
		}

		doc.moveDown(0.8);

		const yCabecalho = doc.y;
		doc.fontSize(8).fillColor("#ffffff");
		let x = MARGEM;
		for (const coluna of params.colunas) {
			const w = coluna.width * escala;
			doc
				.rect(x, yCabecalho, w, 18)
				.fill("#dc2626");
			doc.fillColor("#ffffff").text(coluna.label, x + 4, yCabecalho + 5, {
				width: w - 8,
				align: coluna.align ?? "left",
				lineBreak: false,
			});
			x += w;
		}

		let y = yCabecalho + 18;
		doc.fillColor("#111827");

		const desenharCabecalhoPagina = () => {
			x = MARGEM;
			for (const coluna of params.colunas) {
				const w = coluna.width * escala;
				doc.rect(x, y, w, 18).fill("#dc2626");
				doc.fillColor("#ffffff").text(coluna.label, x + 4, y + 5, {
					width: w - 8,
					align: coluna.align ?? "left",
					lineBreak: false,
				});
				x += w;
			}
			y += 18;
			doc.fillColor("#111827");
		};

		for (let i = 0; i < params.linhas.length; i++) {
			const linha = params.linhas[i];
			if (!linha) continue;

			if (y > doc.page.height - MARGEM - ALTURA_RODAPE) {
				doc.addPage({ size: "A4", layout: "landscape", margin: MARGEM });
				y = MARGEM;
				desenharCabecalhoPagina();
			}

			if (i % 2 === 1) {
				doc.rect(MARGEM, y, larguraUtil, 16).fill("#f9fafb");
				doc.fillColor("#111827");
			}

			x = MARGEM;
			for (let c = 0; c < params.colunas.length; c++) {
				const coluna = params.colunas[c];
				if (!coluna) continue;
				const w = coluna.width * escala;
				const texto = linha[c] ?? "";
				doc.fontSize(7).text(texto, x + 4, y + 4, {
					width: w - 8,
					align: coluna.align ?? "left",
					lineBreak: false,
				});
				x += w;
			}
			y += 16;
		}

		doc.end();
	});
}
