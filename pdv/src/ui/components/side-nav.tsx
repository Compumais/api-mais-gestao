import {
	Bike,
	Receipt,
	Settings,
	ShoppingCart,
	UtensilsCrossed,
} from "lucide-react";
import type { ComponentType } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
	rotuloModelo,
	type StatusContext,
	type StatusPdv,
} from "@/lib/pdv-types";
import { cn } from "@/lib/utils";
import { secundarioDesconectado } from "@/ui/components/aviso-secundario";

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
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	onClick: () => void;
	active?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2.5 text-xs font-semibold transition ring-1",
				active
					? "bg-sidebar-primary text-sidebar-primary-foreground ring-sidebar-primary"
					: "bg-sidebar-accent/40 text-sidebar-foreground ring-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			)}
		>
			<Icon className="size-5" />
			{label}
		</button>
	);
}

function mensagemBloqueio(status: StatusPdv | null | undefined) {
	return (
		status?.principalErro ?? "PDV principal offline. Operação bloqueada."
	);
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

	const mesasAtivo = path === "/" || path.startsWith("/mesas/");
	const balcaoAtivo = path === "/balcao" || (!gourmet && path === "/");
	const deliveryAtivo = path === "/delivery" || path.startsWith("/delivery/");

	function tentarNavegar(destino: string) {
		if (bloqueado) {
			onBlocked?.(mensagemBloqueio(status));
			return;
		}
		navigate(destino);
	}

	return (
		<aside className="flex w-36 shrink-0 flex-col gap-1.5 rounded-xl bg-sidebar p-1.5 text-sidebar-foreground ring-1 ring-sidebar-border">
			{gourmet ? (
				<SideButton
					label={rotulo.plural}
					icon={UtensilsCrossed}
					active={mesasAtivo}
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
					onClick={() => {
						if (deliveryAtivo && path === "/delivery") return;
						tentarNavegar("/delivery");
					}}
				/>
			) : null}
			<SideButton
				label="Vendas"
				icon={Receipt}
				onClick={() => navigate("/vendas")}
			/>
			{status?.podeConfigurar ? (
				<SideButton
					label="Config"
					icon={Settings}
					onClick={() => navigate("/config")}
				/>
			) : null}
		</aside>
	);
}
