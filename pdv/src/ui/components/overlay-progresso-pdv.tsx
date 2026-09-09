import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ETAPAS_SINCRONIZAR = [
	"Conectando à retaguarda…",
	"Buscando NFC-e remotas…",
	"Reconciliando cupons locais…",
	"Atualizando status das vendas…",
	"Finalizando sincronização…",
];

const ETAPAS_TRANSMITIR = [
	"Conectando à retaguarda…",
	"Sincronizando numeração fiscal…",
	"Processando fila (outbox)…",
	"Retransmitindo NFC-e pendentes…",
	"Atualizando cupons na retaguarda…",
	"Consolidando resultados…",
];

const ETAPAS_ENVIAR = [
	"Conectando à retaguarda…",
	"Enviando itens da fila local…",
	"Atualizando NFC-e…",
	"Conferindo pendências…",
];

export type TipoOverlayProgressoPdv =
	| "sincronizar-nfce"
	| "transmitir-pendentes"
	| "enviar-retaguarda";

const ETAPAS_POR_TIPO: Record<TipoOverlayProgressoPdv, string[]> = {
	"sincronizar-nfce": ETAPAS_SINCRONIZAR,
	"transmitir-pendentes": ETAPAS_TRANSMITIR,
	"enviar-retaguarda": ETAPAS_ENVIAR,
};

const TITULO_POR_TIPO: Record<TipoOverlayProgressoPdv, string> = {
	"sincronizar-nfce": "Sincronizando NFC-e",
	"transmitir-pendentes": "Transmitindo pendentes",
	"enviar-retaguarda": "Enviando para retaguarda",
};

type OverlayProgressoPdvProps = {
	aberto: boolean;
	tipo: TipoOverlayProgressoPdv;
	detalhe?: string | null;
};

/**
 * Overlay modal de progresso para operações longas (sync / transmitir lote).
 * Cicla etapas visuais enquanto a operação IPC bloqueia a UI.
 */
export function OverlayProgressoPdv({
	aberto,
	tipo,
	detalhe,
}: OverlayProgressoPdvProps) {
	const etapas = ETAPAS_POR_TIPO[tipo];
	const [indice, setIndice] = useState(0);

	useEffect(() => {
		if (!aberto) {
			setIndice(0);
			return;
		}
		const id = window.setInterval(() => {
			setIndice((atual) => (atual + 1) % etapas.length);
		}, 2200);
		return () => window.clearInterval(id);
	}, [aberto, etapas.length]);

	if (!aberto) return null;

	const progresso = ((indice + 1) / etapas.length) * 100;

	return (
		<div
			className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
			role="alertdialog"
			aria-modal="true"
			aria-busy="true"
			aria-labelledby="overlay-progresso-titulo"
			aria-describedby="overlay-progresso-etapa"
		>
			<div className="pdv-surface w-full max-w-md space-y-5 p-6 shadow-lg ring-1 ring-foreground/10">
				<div className="flex items-start gap-3">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Loader2 className="size-6 animate-spin" aria-hidden />
					</div>
					<div className="min-w-0 space-y-1">
						<h2
							id="overlay-progresso-titulo"
							className="text-lg font-semibold tracking-tight"
						>
							{TITULO_POR_TIPO[tipo]}
						</h2>
						<p className="text-sm text-muted-foreground">
							Aguarde — não feche o PDV durante esta operação.
						</p>
					</div>
				</div>

				<div className="space-y-2">
					<div
						className="h-2 overflow-hidden rounded-full bg-muted"
						aria-hidden
					>
						<div
							className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
							style={{ width: `${Math.max(12, progresso)}%` }}
						/>
					</div>
					<p
						id="overlay-progresso-etapa"
						className="text-sm font-medium text-foreground"
					>
						{etapas[indice]}
					</p>
					{detalhe ? (
						<p className="text-xs text-muted-foreground">{detalhe}</p>
					) : null}
				</div>

				<ul className="space-y-1.5" aria-hidden>
					{etapas.map((etapa, i) => (
						<li
							key={etapa}
							className={cn(
								"flex items-center gap-2 text-xs transition-colors",
								i === indice
									? "font-medium text-foreground"
									: i < indice
										? "text-muted-foreground/80"
										: "text-muted-foreground/50",
							)}
						>
							<span
								className={cn(
									"size-1.5 shrink-0 rounded-full",
									i === indice
										? "bg-primary"
										: i < indice
											? "bg-primary/50"
											: "bg-muted-foreground/30",
								)}
							/>
							{etapa}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
