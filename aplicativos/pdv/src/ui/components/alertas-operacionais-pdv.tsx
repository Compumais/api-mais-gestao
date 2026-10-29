import { AlertTriangle, CloudOff, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StatusPdv } from "@/lib/pdv-types";
import { Button } from "@/ui/components/ui/button";

type AlertasOperacionaisPdvProps = {
	status: StatusPdv | null | undefined;
	/** Esconde o atalho para vendas quando já estiver nessa área. */
	esconderAtalhoVendas?: boolean;
};

/**
 * Alertas operacionais: contingência offline e cupons pendentes de transmissão.
 */
export function AlertasOperacionaisPdv({
	status,
	esconderAtalhoVendas = false,
}: AlertasOperacionaisPdvProps) {
	const navigate = useNavigate();
	if (!status) return null;

	const offline = !status.online;
	const emitirNfce = status.emitirNfce !== false;
	const pendentes = status.nfcePendentesTransmissao ?? 0;
	const mostrarContingencia = offline && emitirNfce;
	const mostrarPendentes = emitirNfce && pendentes > 0;

	if (!mostrarContingencia && !mostrarPendentes) {
		return null;
	}

	return (
		<div className="flex shrink-0 flex-col gap-2">
			{mostrarContingencia ? (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-600/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-950 dark:text-amber-50"
					role="status"
					aria-live="polite"
				>
					<div className="flex min-w-0 items-start gap-2">
						<WifiOff
							className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
							aria-hidden
						/>
						<div className="min-w-0">
							<p className="font-semibold">Contingência offline</p>
							<p className="text-xs opacity-90">
								Sem conexão com a retaguarda. As NFC-e serão emitidas em
								contingência (tpEmis=9) e transmitidas quando a conexão voltar.
							</p>
						</div>
					</div>
					<span className="inline-flex items-center gap-1 rounded-md bg-amber-600/20 px-2 py-1 text-xs font-medium">
						<CloudOff className="size-3.5" aria-hidden />
						Offline
					</span>
				</div>
			) : null}

			{mostrarPendentes ? (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-600/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-50"
					role="status"
					aria-live="polite"
				>
					<div className="flex min-w-0 items-start gap-2">
						<AlertTriangle
							className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300"
							aria-hidden
						/>
						<div className="min-w-0">
							<p className="font-semibold">
								{pendentes} cupom
								{pendentes === 1 ? "" : "s"} pendente
								{pendentes === 1 ? "" : "s"} de transmissão
							</p>
							<p className="text-xs opacity-90">
								Há NFC-e em contingência ou aguardando envio à SEFAZ. Sincronize
								e transmita as pendentes.
							</p>
						</div>
					</div>
					{!esconderAtalhoVendas ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => navigate("/vendas/nao-sincronizadas")}
						>
							Ver pendentes
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
