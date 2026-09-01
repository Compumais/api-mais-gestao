import type { ReactNode } from "react";
import type { StatusPdv } from "@/lib/pdv-types";
import { SideNav } from "@/ui/components/side-nav";

type PdvShellProps = {
	topbar: ReactNode;
	children: ReactNode;
	/** StatusBar, FunctionBar, dialogs, etc. */
	footer?: ReactNode;
	/** Exibe o rail lateral (padrão: true). */
	sideNav?: boolean;
	status?: StatusPdv | null;
	onBlockedNavigate?: (mensagem: string) => void;
	onMesasActiveClick?: () => void;
};

/**
 * Shell operacional do PDV: Topbar + conteúdo (+ SideNav opcional) + rodapé.
 * Mantém h-screen / min-h-0 para a FunctionBar ficar fixa embaixo.
 */
export function PdvShell({
	topbar,
	children,
	footer,
	sideNav = true,
	status,
	onBlockedNavigate,
	onMesasActiveClick,
}: PdvShellProps) {
	return (
		<div className="flex h-screen flex-col">
			{topbar}
			<div className="flex min-h-0 flex-1 gap-3 overflow-hidden bg-muted/30 p-3">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					{children}
				</div>
				{sideNav ? (
					<SideNav
						status={status}
						onBlocked={onBlockedNavigate}
						onMesasActiveClick={onMesasActiveClick}
					/>
				) : null}
			</div>
			{footer}
		</div>
	);
}
