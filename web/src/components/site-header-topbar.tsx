import { CompanyToogle } from "./company-toogle";
import { InformativosBanner } from "./informativos-banner";
import { NotificationsBell } from "./notifications-bell";
import { RefreshButton } from "./refresh-button";
import { SearchButton } from "./search-button";
import { ThemeToogle } from "./theme-toogle";

export function SiteHeaderTopbar() {
	return (
		<>
			<InformativosBanner />
			<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
				<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-4">
					<div className="ml-auto flex items-center gap-2">
						<CompanyToogle />
						<RefreshButton />
						<SearchButton />
						<ThemeToogle />
						<NotificationsBell />
					</div>
				</div>
			</header>
		</>
	);
}
