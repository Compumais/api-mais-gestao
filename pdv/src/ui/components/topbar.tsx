import {
	ArrowLeft,
	LogOut,
	Monitor,
	PanelLeft,
	UserRound,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { StatusPdv } from "@/lib/pdv-types";
import { LogoMaisGestao } from "@/ui/components/logo-mais-gestao";
import { PosConnectionDialog } from "@/ui/components/pos-connection-dialog";
import { useSidebarState } from "@/ui/hooks/use-sidebar-state";

type TopbarProps = {
	title: string;
	subtitle?: string | null;
	center?: ReactNode;
	right?: ReactNode;
	status?: StatusPdv | null;
	onExit?: () => void;
	exitLabel?: string;
};

export function Topbar({
	title,
	subtitle,
	center,
	right,
	status,
	onExit,
	exitLabel = "Sair",
}: TopbarProps) {
	const [agora, setAgora] = useState(new Date());
	const { recolhida, alternar } = useSidebarState();

	useEffect(() => {
		const id = setInterval(() => setAgora(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<header className="flex h-16 shrink-0 items-center gap-4 bg-sidebar px-3 text-sidebar-foreground shadow-sm">
			<div className="flex w-52 min-w-0 shrink-0 items-center gap-2.5">
				<button
					type="button"
					onClick={alternar}
					aria-label={
						recolhida ? "Expandir menu lateral" : "Recolher menu lateral"
					}
					title={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
					aria-pressed={recolhida}
					className="pdv-touch -ml-1 flex shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
				>
					<PanelLeft
						className={recolhida ? "size-5 scale-x-[-1]" : "size-5"}
						aria-hidden
					/>
				</button>
				<LogoMaisGestao variante="branco" className="h-9 shrink-0" />
				<div className="min-w-0">
					<div className="truncate text-sm font-bold tracking-tight">
						{title}
					</div>
					{subtitle && (
						<div className="truncate text-[0.65rem] opacity-80">{subtitle}</div>
					)}
				</div>
			</div>
			<div className="min-w-0 flex-1">{center}</div>
			<div className="flex shrink-0 items-center gap-2">
				{status && status.modo !== "secundario" ? (
					<PosConnectionDialog />
				) : null}
				{right}
				{status ? (
					<>
						<div className="hidden items-center gap-2 rounded-lg px-2 py-1 lg:flex">
							<UserRound className="size-4 opacity-80" />
							<div className="max-w-32 leading-tight">
								<div className="truncate text-xs font-semibold">
									{status.caixa?.username ??
										status.sessao.username ??
										"Operador"}
								</div>
								<div className="truncate text-[10px] opacity-70">
									{status.caixa
										? `Caixa ${status.caixa.numeropdv}`
										: `PDV ${status.numeropdv}`}
								</div>
							</div>
						</div>
						<div
							className="hidden items-center gap-1 rounded-md bg-white/8 px-2 py-1.5 text-[10px] font-semibold xl:flex"
							title={status.online ? "Conectado" : "Operando offline"}
						>
							{status.online ? (
								<Wifi className="size-3.5 text-emerald-300" />
							) : (
								<WifiOff className="size-3.5 text-amber-300" />
							)}
							{status.online ? "Online" : "Offline"}
						</div>
						<div className="hidden items-center gap-1 opacity-75 2xl:flex">
							<Monitor className="size-3.5" />
							<span className="text-[10px]">PDV {status.numeropdv}</span>
						</div>
					</>
				) : null}
				<div className="text-right leading-tight">
					<div className="text-sm font-bold tabular-nums">
						{agora.toLocaleTimeString("pt-BR")}
					</div>
					<div className="text-[0.65rem] opacity-80">
						{agora.toLocaleDateString("pt-BR")}
					</div>
				</div>
				{onExit ? (
					<button
						type="button"
						onClick={onExit}
						className="pdv-touch ml-1 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 text-xs font-semibold transition hover:bg-white/15"
					>
						{exitLabel === "Sair" ? (
							<LogOut className="size-4" />
						) : (
							<ArrowLeft className="size-4" />
						)}
						{exitLabel}
					</button>
				) : null}
			</div>
		</header>
	);
}
