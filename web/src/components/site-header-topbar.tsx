import { VisualErrorBoundary } from "@/components/error-boundary/visual-error-boundary";
import { NavAbasAbertasBar } from "@/components/nav-abas-abertas-bar";
import { CompanyToogle } from "./company-toogle";
import { CompanyToogleBoundary } from "./error-boundary/company-toogle-error-boundary";
import { TestError } from "./error-boundary/test-error";
import { InformativosBanner } from "./informativos-banner";
import { NotificationsBell } from "./notifications-bell";
import { RefreshButton } from "./refresh-button";
import { SearchButton } from "./search-button";
import { ThemeToogle } from "./theme-toogle";

export function SiteHeaderTopbar() {
	return (
		<>
			<VisualErrorBoundary title="Não foi possível carregar os informativos">
				<InformativosBanner />
			</VisualErrorBoundary>
			<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
				<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-4">
					<VisualErrorBoundary
						title="Não foi possível carregar as abas"
						className="min-h-12 min-w-0 flex-1"
					>
						<NavAbasAbertasBar variante="header" />
					</VisualErrorBoundary>
					<div className="ml-auto flex items-center gap-2">
						<CompanyToogleBoundary>
							<CompanyToogle />
						</CompanyToogleBoundary>
						<RefreshButton />
						<SearchButton />
						<ThemeToogle />
						<VisualErrorBoundary title="Não foi possível carregar as notificações">
							<TestError />
							<NotificationsBell />
						</VisualErrorBoundary>
					</div>
				</div>
			</header>
		</>
	);
}
