"use client";

import type { LayoutModeloImpressaoPedido } from "@/schemas/modelo-impressao-pedido.schema";
import {
	CSS_MODELO_IMPRESSAO_PEDIDO,
	type DadosPreviewModeloImpressaoPedido,
	DADOS_AMOSTRA_MODELO_IMPRESSAO_PEDIDO,
	renderizarHtmlModeloImpressaoPedido,
} from "@/util/renderizar-modelo-impressao-pedido";

type PreviewModeloImpressaoPedidoProps = {
	layout: LayoutModeloImpressaoPedido;
	dados?: DadosPreviewModeloImpressaoPedido;
	className?: string;
};

export function PreviewModeloImpressaoPedido({
	layout,
	dados = DADOS_AMOSTRA_MODELO_IMPRESSAO_PEDIDO,
	className,
}: PreviewModeloImpressaoPedidoProps) {
	const html = renderizarHtmlModeloImpressaoPedido(layout, dados);

	return (
		<div className={className}>
			<style>{CSS_MODELO_IMPRESSAO_PEDIDO}</style>
			<div
				className="folha-os shadow-md border mx-auto origin-top scale-[0.72] sm:scale-90 lg:scale-100"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML gerado localmente a partir do layout
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</div>
	);
}
