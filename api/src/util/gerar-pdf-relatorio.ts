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
	periodoInicio?: string;
	periodoFim?: string;
	periodoLabel?: string;
	colunas: ColunaPdfRelatorio[];
	linhas: string[][];
	resumoLinhas?: string[];
	filename: string;
};

export type SecaoPdfRelatorio = {
	cabecalho: string;
	linhas: string[][];
};

export type GerarPdfRelatorioAgrupadoParams = Omit<
	GerarPdfRelatorioParams,
	"linhas"
> & {
	secoes: SecaoPdfRelatorio[];
	textoVazio?: string;
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

		const larguraUtil = doc.page.width - MARGEM * 2;
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
			.text(
				`${params.empresaNome} — CNPJ ${formatarCnpj(params.empresaCnpj)}`,
				{
					align: "center",
				},
			);
		if (params.periodoInicio && params.periodoFim) {
			doc.text(
				`Período: ${formatarDataBr(params.periodoInicio)} a ${formatarDataBr(params.periodoFim)}`,
				{ align: "center" },
			);
		} else if (params.periodoLabel) {
			doc.text(params.periodoLabel, { align: "center" });
		}
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
			doc.rect(x, yCabecalho, w, 18).fill("#dc2626");
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

function criarDocumentoPdf(
	params: Pick<
		GerarPdfRelatorioParams,
		| "titulo"
		| "empresaNome"
		| "empresaCnpj"
		| "periodoInicio"
		| "periodoFim"
		| "periodoLabel"
		| "resumoLinhas"
		| "filename"
	>,
	onReady: (doc: InstanceType<typeof PDFDocument>) => void,
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

		desenharCabecalhoRelatorio(doc, params);
		onReady(doc);
		doc.end();
	});
}

function desenharCabecalhoRelatorio(
	doc: InstanceType<typeof PDFDocument>,
	params: Pick<
		GerarPdfRelatorioParams,
		| "titulo"
		| "empresaNome"
		| "empresaCnpj"
		| "periodoInicio"
		| "periodoFim"
		| "periodoLabel"
		| "resumoLinhas"
	>,
) {
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
	if (params.periodoInicio && params.periodoFim) {
		doc.text(
			`Período: ${formatarDataBr(params.periodoInicio)} a ${formatarDataBr(params.periodoFim)}`,
			{ align: "center" },
		);
	} else if (params.periodoLabel) {
		doc.text(params.periodoLabel, { align: "center" });
	}
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
}

function calcularEscalaColunas(
	doc: InstanceType<typeof PDFDocument>,
	colunas: ColunaPdfRelatorio[],
) {
	const larguraUtil = doc.page.width - MARGEM * 2;
	const larguraColunas = colunas.reduce((s, c) => s + c.width, 0);
	return {
		larguraUtil,
		escala: larguraColunas > larguraUtil ? larguraUtil / larguraColunas : 1,
	};
}

function desenharCabecalhoColunas(
	doc: InstanceType<typeof PDFDocument>,
	colunas: ColunaPdfRelatorio[],
	y: number,
	escala: number,
	corFundo = "#dc2626",
	corTexto = "#ffffff",
) {
	let x = MARGEM;
	doc.fontSize(8).fillColor(corTexto);
	for (const coluna of colunas) {
		const w = coluna.width * escala;
		doc.rect(x, y, w, 18).fill(corFundo);
		doc.fillColor(corTexto).text(coluna.label, x + 4, y + 5, {
			width: w - 8,
			align: coluna.align ?? "left",
			lineBreak: false,
		});
		x += w;
	}
	doc.fillColor("#111827");
	return y + 18;
}

export function gerarPdfRelatorioAgrupado(
	params: GerarPdfRelatorioAgrupadoParams,
): Promise<PdfRelatorioResultado> {
	return criarDocumentoPdf(params, (doc) => {
		const { larguraUtil, escala } = calcularEscalaColunas(doc, params.colunas);
		const textoVazio = params.textoVazio ?? "Sem produtos neste documento";
		let y = doc.y;

		const novaPagina = () => {
			doc.addPage({ size: "A4", layout: "landscape", margin: MARGEM });
			y = MARGEM;
		};

		const precisaQuebrar = (altura: number) =>
			y + altura > doc.page.height - MARGEM - ALTURA_RODAPE;

		for (const secao of params.secoes) {
			doc.fontSize(8);
			const alturaCabecalho =
				doc.heightOfString(secao.cabecalho, { width: larguraUtil - 16 }) + 12;
			const alturaMinima = alturaCabecalho + 18 + 16;

			if (precisaQuebrar(alturaMinima)) {
				novaPagina();
			}

			doc.rect(MARGEM, y, larguraUtil, alturaCabecalho).fill("#991b1b");
			doc
				.fontSize(8)
				.fillColor("#ffffff")
				.text(secao.cabecalho, MARGEM + 8, y + 6, {
					width: larguraUtil - 16,
				});
			y += alturaCabecalho;

			y = desenharCabecalhoColunas(
				doc,
				params.colunas,
				y,
				escala,
				"#fee2e2",
				"#7f1d1d",
			);

			if (secao.linhas.length === 0) {
				if (precisaQuebrar(16)) {
					novaPagina();
					y = desenharCabecalhoColunas(
						doc,
						params.colunas,
						y,
						escala,
						"#fee2e2",
						"#7f1d1d",
					);
				}
				doc.rect(MARGEM, y, larguraUtil, 16).fill("#f9fafb");
				doc
					.fontSize(7)
					.fillColor("#6b7280")
					.text(textoVazio, MARGEM + 8, y + 4, {
						width: larguraUtil - 16,
					});
				y += 20;
				continue;
			}

			for (let i = 0; i < secao.linhas.length; i++) {
				const linha = secao.linhas[i];
				if (!linha) continue;

				let alturaLinha = 16;
				doc.fontSize(7);
				for (let c = 0; c < params.colunas.length; c++) {
					const coluna = params.colunas[c];
					if (!coluna) continue;
					const w = coluna.width * escala;
					const texto = linha[c] ?? "";
					const alturaCelula = doc.heightOfString(texto, { width: w - 8 }) + 8;
					alturaLinha = Math.max(alturaLinha, alturaCelula);
				}

				if (precisaQuebrar(alturaLinha)) {
					novaPagina();
					doc
						.fontSize(7)
						.fillColor("#6b7280")
						.text(`Continuação — ${secao.cabecalho}`, MARGEM, y, {
							width: larguraUtil,
							lineBreak: false,
						});
					y += 14;
					y = desenharCabecalhoColunas(
						doc,
						params.colunas,
						y,
						escala,
						"#fee2e2",
						"#7f1d1d",
					);
				}

				if (i % 2 === 1) {
					doc.rect(MARGEM, y, larguraUtil, alturaLinha).fill("#f9fafb");
				}

				let x = MARGEM;
				doc.fillColor("#111827").fontSize(7);
				for (let c = 0; c < params.colunas.length; c++) {
					const coluna = params.colunas[c];
					if (!coluna) continue;
					const w = coluna.width * escala;
					doc.text(linha[c] ?? "", x + 4, y + 4, {
						width: w - 8,
						align: coluna.align ?? "left",
					});
					x += w;
				}
				y += alturaLinha;
			}

			y += 10;
		}
	});
}
