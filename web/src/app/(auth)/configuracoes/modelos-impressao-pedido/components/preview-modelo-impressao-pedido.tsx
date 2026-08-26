"use client";

import { useEffect, useRef, useState } from "react";
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
	mostrarLimiteFolha?: boolean;
};

export function PreviewModeloImpressaoPedido({
	layout,
	dados = DADOS_AMOSTRA_MODELO_IMPRESSAO_PEDIDO,
	className,
	mostrarLimiteFolha = true,
}: PreviewModeloImpressaoPedidoProps) {
	const html = renderizarHtmlModeloImpressaoPedido(layout, dados);
	const folhaRef = useRef<HTMLDivElement>(null);
	const [ultrapassaFolha, setUltrapassaFolha] = useState(false);

	useEffect(() => {
		if (!mostrarLimiteFolha) {
			setUltrapassaFolha(false);
			return;
		}
		const el = folhaRef.current;
		if (!el) return;

		const mmToPx = (mm: number) => (mm * 96) / 25.4;
		const alturaA4 = mmToPx(297);

		const medir = () => {
			setUltrapassaFolha(el.scrollHeight > alturaA4 + 2);
		};

		medir();
		const observer = new ResizeObserver(medir);
		observer.observe(el);
		return () => observer.disconnect();
	}, [html, mostrarLimiteFolha]);

	return (
		<div className={className}>
			<style>{CSS_MODELO_IMPRESSAO_PEDIDO}</style>
			<div
				ref={folhaRef}
				className="folha-os folha-os-preview shadow-md border mx-auto origin-top scale-[0.72] sm:scale-90 lg:scale-100"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML gerado localmente a partir do layout
				dangerouslySetInnerHTML={{
					__html: `${html}${
						mostrarLimiteFolha && ultrapassaFolha
							? `<div class="limite-folha"></div><div class="aviso-folha">Conteúdo ultrapassa 1 folha A4 — ajuste blocos ou use colunas</div>`
							: ""
					}`,
				}}
			/>
		</div>
	);
}
