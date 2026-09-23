import {
	Bike,
	ClipboardList,
	Receipt,
	Settings,
	ShoppingCart,
	UserRound,
	UtensilsCrossed,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { onDeliveryEvent, onWhatsappEvent, pdvInvoke } from "@/lib/pdv-api";
import {
	rotuloModelo,
	type StatusContext,
	type StatusPdv,
} from "@/lib/pdv-types";
import { cn } from "@/lib/utils";
import { secundarioDesconectado } from "@/ui/components/aviso-secundario";
import { useSidebarState } from "@/ui/hooks/use-sidebar-state";

type SideNavProps = {
	/** Callback quando a navegação é bloqueada (PDV secundário offline). */
	onBlocked?: (mensagem: string) => void;
	/** Clique no item Mesas/Comandas já ativo (ex.: recarregar lista). */
	onMesasActiveClick?: () => void;
	status?: StatusPdv | null;
};

function SideButton({
	label,
	icon: Icon,
	onClick,
	active,
	recolhida,
	badge,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	onClick: () => void;
	active?: boolean;
	recolhida: boolean;
	badge?: number;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={badge && badge > 0 ? `${label} (${badge} novos)` : label}
			title={recolhida ? label : undefined}
			aria-current={active ? "page" : undefined}
			className={cn(
				"pdv-touch relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition",
				recolhida && "justify-center gap-0 px-0",
				active
					? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
					: "text-sidebar-foreground/82 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			)}
		>
			<span className="relative shrink-0">
				<Icon className="size-[18px]" />
				{badge && badge > 0 ? (
					<span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
						{badge > 99 ? "99+" : badge}
					</span>
				) : null}
			</span>
			<span className={cn("truncate", recolhida && "sr-only")}>{label}</span>
			{!recolhida && badge && badge > 0 ? (
				<span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
					{badge > 99 ? "99+" : badge}
				</span>
			) : null}
		</button>
	);
}

function mensagemBloqueio(status: StatusPdv | null | undefined) {
	return status?.principalErro ?? "PDV principal offline. Operação bloqueada.";
}

/** Rail lateral compacto das telas operacionais do PDV. */
export function SideNav({
	onBlocked,
	onMesasActiveClick,
	status: statusProp,
}: SideNavProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const ctx = useOutletContext<StatusContext | undefined>();
	const status = statusProp ?? ctx?.status ?? null;
	const gourmet = Boolean(status?.moduloGourmet);
	const bloqueado = secundarioDesconectado(status);
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const path = location.pathname;
	const { recolhida } = useSidebarState();
	const [novosDelivery, setNovosDelivery] = useState(0);

	useEffect(() => {
		if (!gourmet || bloqueado) {
			setNovosDelivery(0);
			return;
		}
		let cancelado = false;
		async function atualizarBadge() {
			try {
				const [novos, naoLidas] = await Promise.all([
					pdvInvoke<number>("contarPedidosEntregaNovos"),
					pdvInvoke<number>("whatsapp.contarNaoLidas"),
				]);
				if (!cancelado) {
					setNovosDelivery((Number(novos) || 0) + (Number(naoLidas) || 0));
				}
			} catch {
				if (!cancelado) setNovosDelivery(0);
			}
		}
		void atualizarBadge();
		const timer = window.setInterval(() => {
			void atualizarBadge();
		}, 4000);
		const offWa = onWhatsappEvent(() => {
			void atualizarBadge();
		});
		const offDelivery = onDeliveryEvent(() => {
			void atualizarBadge();
		});
		return () => {
			cancelado = true;
			window.clearInterval(timer);
			offWa();
			offDelivery();
		};
	}, [gourmet, bloqueado, path]);

	const mesasAtivo = path === "/" || path.startsWith("/mesas/");
	const balcaoAtivo = path === "/balcao" || (!gourmet && path === "/");
	const deliveryAtivo = path === "/delivery" || path.startsWith("/delivery/");
	const pedidosAtivo = path === "/pedidos" || path.startsWith("/pedidos/");
	const vendasAtivo = path === "/vendas" || path.startsWith("/vendas/");
	const configAtivo = path === "/config";

	function tentarNavegar(destino: string) {
		if (bloqueado) {
			onBlocked?.(mensagemBloqueio(status));
			return;
		}
		navigate(destino);
	}

	return (
		<aside
			className={cn(
				"flex shrink-0 flex-col bg-sidebar p-2 text-sidebar-foreground shadow-lg transition-[width] duration-150",
				recolhida ? "w-16" : "w-48",
			)}
		>
			<nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-1">
				{gourmet ? (
					<SideButton
						label={rotulo.plural}
						icon={UtensilsCrossed}
						active={mesasAtivo}
						recolhida={recolhida}
						onClick={() => {
							if (mesasAtivo) {
								onMesasActiveClick?.();
								return;
							}
							navigate("/");
						}}
					/>
				) : null}
				<SideButton
					label="Balcão"
					icon={ShoppingCart}
					active={balcaoAtivo}
					recolhida={recolhida}
					onClick={() => {
						if (balcaoAtivo) return;
						tentarNavegar("/balcao");
					}}
				/>
				{gourmet ? (
					<SideButton
						label="Delivery"
						icon={Bike}
						active={deliveryAtivo}
						recolhida={recolhida}
						badge={novosDelivery}
						onClick={() => {
							if (deliveryAtivo && path === "/delivery") return;
							tentarNavegar("/delivery");
						}}
					/>
				) : null}
				{gourmet ? (
					<SideButton
						label="Pedidos"
						icon={ClipboardList}
						active={pedidosAtivo}
						recolhida={recolhida}
						onClick={() => {
							if (pedidosAtivo) return;
							tentarNavegar("/pedidos");
						}}
					/>
				) : null}
				<SideButton
					label="Histórico de vendas"
					icon={Receipt}
					active={vendasAtivo}
					recolhida={recolhida}
					onClick={() => {
						if (vendasAtivo) return;
						navigate("/vendas");
					}}
				/>
				{status?.podeConfigurar ? (
					<SideButton
						label="Configurações"
						icon={Settings}
						active={configAtivo}
						recolhida={recolhida}
						onClick={() => navigate("/config")}
					/>
				) : null}
			</nav>
			<div
				className={cn(
					"mt-2 rounded-lg border border-sidebar-border bg-black/10 p-2.5",
					recolhida && "px-1.5",
				)}
				title={
					recolhida
						? `${status?.caixa?.username ?? status?.sessao.username ?? "Operador"} · Caixa ${status?.caixa?.numeropdv ?? status?.numeropdv ?? "—"}`
						: undefined
				}
			>
				<div
					className={cn(
						"flex items-center gap-2",
						recolhida && "justify-center",
					)}
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary">
						<UserRound className="size-4" />
					</div>
					<div className={cn("min-w-0 flex-1", recolhida && "hidden")}>
						<div className="truncate text-xs font-semibold">
							{status?.caixa?.username ?? status?.sessao.username ?? "Operador"}
						</div>
						<div className="truncate text-[10px] opacity-65">
							Caixa {status?.caixa?.numeropdv ?? status?.numeropdv ?? "—"}
						</div>
					</div>
					{!recolhida &&
						(status?.online ? (
							<Wifi className="size-3.5 text-emerald-300" />
						) : (
							<WifiOff className="size-3.5 text-amber-300" />
						))}
				</div>
			</div>
		</aside>
	);
}
