"use client";

import type { LayoutModeloImpressaoOs } from "@/schemas/modelo-impressao-os.schema";
import {
	CSS_MODELO_IMPRESSAO_OS,
	type DadosPreviewModeloImpressaoOs,
	DADOS_AMOSTRA_MODELO_IMPRESSAO_OS,
	renderizarHtmlModeloImpressaoOs,
} from "@/util/renderizar-modelo-impressao-os";

type PreviewModeloImpressaoOsProps = {
	layout: LayoutModeloImpressaoOs;
	dados?: DadosPreviewModeloImpressaoOs;
	className?: string;
};

export function PreviewModeloImpressaoOs({
	layout,
	dados = DADOS_AMOSTRA_MODELO_IMPRESSAO_OS,
	className,
}: PreviewModeloImpressaoOsProps) {
	const html = renderizarHtmlModeloImpressaoOs(layout, dados);

	return (
		<div className={className}>
			<style>{CSS_MODELO_IMPRESSAO_OS}</style>
			<div
				className="folha-os shadow-md border mx-auto origin-top scale-[0.72] sm:scale-90 lg:scale-100"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML gerado localmente a partir do layout
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</div>
	);
}
