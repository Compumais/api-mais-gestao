import { AlertTriangle, CloudOff, ShieldAlert, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StatusPdv } from "@/lib/pdv-types";
import { Button } from "@/ui/components/ui/button";

type AlertasOperacionaisPdvProps = {
	status: StatusPdv | null | undefined;
	/** Esconde o atalho para vendas quando já estiver nessa área. */
	esconderAtalhoVendas?: boolean;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_ALERTA_CERTIFICADO = 30;

function avaliarCertificadoPdv(validadeIso: string | null | undefined) {
	if (!validadeIso) return null;
	const data = new Date(validadeIso);
	if (Number.isNaN(data.getTime())) return null;

	const agora = new Date();
	const inicioHoje = Date.UTC(
		agora.getFullYear(),
		agora.getMonth(),
		agora.getDate(),
	);
	const inicioValidade = Date.UTC(
		data.getFullYear(),
		data.getMonth(),
		data.getDate(),
	);
	const diasRestantes = Math.round((inicioValidade - inicioHoje) / MS_POR_DIA);
	if (diasRestantes > DIAS_ALERTA_CERTIFICADO) {
		return null;
	}

	const dataFormatada = data.toLocaleDateString("pt-BR");
	if (diasRestantes < 0) {
		const diasVencidos = Math.abs(diasRestantes);
		return {
			vencido: true,
			critico: true,
			titulo:
				diasVencidos === 1
					? "Seu certificado digital venceu há 1 dia"
					: `Seu certificado digital venceu há ${diasVencidos} dias`,
			dataFormatada,
		};
	}

	if (diasRestantes === 0) {
		return {
			vencido: false,
			critico: true,
			titulo: "Seu certificado digital vence hoje",
			dataFormatada,
		};
	}

	return {
		vencido: false,
		critico: diasRestantes <= 7,
		titulo:
			diasRestantes === 1
				? "Falta 1 dia para o seu certificado vencer"
				: `Faltam ${diasRestantes} dias para o seu certificado vencer`,
		dataFormatada,
	};
}

/**
 * Alertas operacionais: vencimento do certificado digital, contingência offline e cupons pendentes de transmissão.
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
	const alertaCertificado = emitirNfce
		? avaliarCertificadoPdv(status.certificadoValidade)
		: null;

	if (!mostrarContingencia && !mostrarPendentes && !alertaCertificado) {
		return null;
	}

	return (
		<div className="flex shrink-0 flex-col gap-2">
			{alertaCertificado ? (
				<div
					className={
						alertaCertificado.critico
							? "flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-600/50 bg-red-500/15 px-3 py-2 text-sm text-red-950 dark:text-red-50"
							: "flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-600/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-950 dark:text-amber-50"
					}
					role="alert"
					aria-live="polite"
				>
					<div className="flex min-w-0 items-start gap-2">
						<ShieldAlert
							className={
								alertaCertificado.critico
									? "mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-300"
									: "mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
							}
							aria-hidden
						/>
						<div className="min-w-0">
							<p className="font-semibold">{alertaCertificado.titulo}</p>
							<p className="text-xs opacity-90">
								{status.certificadoApelido
									? `${status.certificadoApelido} · `
									: ""}
								Validade até {alertaCertificado.dataFormatada}. Renove o
								certificado A1 na retaguarda e sincronize os dados fiscais no
								PDV para evitar interrupção na emissão de NFC-e.
							</p>
						</div>
					</div>
					{status.podeConfigurar ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => navigate("/configuracoes")}
						>
							Configurações
						</Button>
					) : null}
				</div>
			) : null}

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
