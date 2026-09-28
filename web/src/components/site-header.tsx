import { VisualErrorBoundary } from "@/components/error-boundary/visual-error-boundary";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CompanyToogle } from "./company-toogle";
import { InformativosBanner } from "./informativos-banner";
import { NotificationsBell } from "./notifications-bell";
import { RefreshButton } from "./refresh-button";
import { SearchButton } from "./search-button";
import { ThemeToogle } from "./theme-toogle";

export function SiteHeader() {
	return (
		<>
			<VisualErrorBoundary title="Não foi possível carregar os informativos">
				<InformativosBanner />
			</VisualErrorBoundary>
			<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="ml-auto flex items-center gap-2">
					<VisualErrorBoundary
						title="Não foi possível carregar a seleção de empresa"
						className="p-2"
					>
						<CompanyToogle />
					</VisualErrorBoundary>
					<RefreshButton />
					<SearchButton />
					<ThemeToogle />
					<VisualErrorBoundary title="Não foi possível carregar as notificações">
						<NotificationsBell />
					</VisualErrorBoundary>
				</div>
			</div>
		</header>
		</>
	);
}
